// Field checkout — real bdapps CaaS flow (§A.3): propose basket → HITL approve → debit → receipt.
// No rail/tabs, matching the mock deck's own screenCheckout() — a focused flow, not a workspace tab.
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { ChatToolCalls } from '@astryxdesign/core/Chat';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { bdt } from '../../../../lib/format';
import { proposeBasket, approveAndDebit, type ApiBasketResponse, type ApiReceipt } from '../../../../lib/api';

type Step = 'loading' | 'empty' | 'approve' | 'debiting' | 'receipt' | 'error';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, tf } = useT();
  const { session } = useSession();

  const [step, setStep] = useState<Step>('loading');
  const [basket, setBasket] = useState<ApiBasketResponse | null>(null);
  const [receipt, setReceipt] = useState<ApiReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/');
      return;
    }
    proposeBasket(id)
      .then((res) => {
        setBasket(res);
        setStep('approve');
      })
      .catch((err) => {
        setError(String(err));
        setStep(String(err).includes('no pending fertilizer') ? 'empty' : 'error');
      });
  }, [id, session, router]);

  function handleApprove() {
    if (!basket) return;
    setStep('debiting');
    approveAndDebit(basket.externalTrxId)
      .then((res) => {
        setReceipt(res.receipt);
        setStep('receipt');
      })
      .catch((err) => {
        setError(String(err));
        setStep('error');
      });
  }

  if (!session) return null;

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="label" color="secondary">
            {t('checkout_eyebrow')}
          </Text>
          <Text type="display-3">{t('checkout_title')}</Text>
          <Text type="supporting" color="secondary">
            {t('checkout_desc')}
          </Text>
        </VStack>

        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={3}>
              {step === 'loading' ? <Skeleton height={220} /> : null}

              {step === 'empty' ? <Banner status="info" title={t('checkout_empty_title')} description={t('checkout_empty_desc')} /> : null}

              {step === 'error' ? <Banner status="error" title={t('login_error_title')} description={error ?? ''} /> : null}

              {step === 'approve' && basket ? (
                <Card variant="yellow" padding={3}>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('checkout_hitl_waiting')}
                    </Text>
                    <Text type="supporting">{tf('approve_charge_desc', { amount: bdt(basket.totalBdt) })}</Text>
                    <List hasDividers>
                      {basket.items.map((row) => (
                        <ListItem
                          key={row.id}
                          label={row.item}
                          description={row.qty != null ? `${row.qty}${row.unit ?? ''}${row.unitCost != null ? ` @ ${bdt(row.unitCost)}` : ''}` : undefined}
                          endContent={<Text type="supporting">{bdt(row.total)}</Text>}
                        />
                      ))}
                    </List>
                    <Text type="supporting" color="secondary">
                      {t('checkout_charged_to')}: {bdt(basket.balanceBdt)}
                    </Text>
                    {basket.balanceBdt < basket.totalBdt ? (
                      <Banner status="error" title={t('checkout_insufficient_title')} description={t('checkout_insufficient_desc')} />
                    ) : null}
                    <VStack gap={1.5}>
                      <Button
                        label={tf('approve_charge_button', { amount: bdt(basket.totalBdt) })}
                        variant="primary"
                        isDisabled={basket.balanceBdt < basket.totalBdt}
                        onClick={handleApprove}
                      />
                      <Button label={t('checkout_cancel')} variant="ghost" onClick={() => router.push(`/field/${id}/money`)} />
                    </VStack>
                  </VStack>
                </Card>
              ) : null}

              {step === 'debiting' ? (
                <Card padding={3}>
                  <VStack gap={2}>
                    <ChatToolCalls calls={[{ key: 'debit', name: 'bdapps_direct_debit', status: 'running', target: basket ? bdt(basket.totalBdt) : '' }]} isExpanded />
                  </VStack>
                </Card>
              ) : null}

              {step === 'receipt' && receipt ? (
                <Card variant="green" padding={3}>
                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Text type="label" weight="semibold">
                        {t('checkout_receipt_title')}
                      </Text>
                    </HStack>
                    <Text type="display-3">{bdt(receipt.amountBdt)}</Text>
                    <MetadataList>
                      <MetadataListItem label="Status">{receipt.status}</MetadataListItem>
                      <MetadataListItem label="Internal Trx ID">{receipt.internalTrxId ?? '—'}</MetadataListItem>
                      <MetadataListItem label="Reference ID">{receipt.referenceId ?? '—'}</MetadataListItem>
                    </MetadataList>
                    <Text type="supporting" color="secondary">
                      {t('checkout_receipt_note_desc')}
                    </Text>
                    <Button label={t('go_to_field')} variant="primary" onClick={() => router.push(`/field/${id}/money`)} />
                  </VStack>
                </Card>
              ) : null}
            </VStack>
          </StackItem>
        </HStack>
      </VStack>
    </AppShell>
  );
}
