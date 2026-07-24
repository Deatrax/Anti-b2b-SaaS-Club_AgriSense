// Screen 10/14 of the /mock deck rebuild — bdapps CaaS payment flow, a 3-step state
// machine (HITL approval -> in-flight -> receipt). No rail/tabs, matching the mock's own
// screenCheckout() (no identityStrip()/fieldTabs() calls there either).
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ChatToolCalls } from '@astryxdesign/core/Chat';
import { CAAS_STATUS } from '@agrisense/shared';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { WhyPanel } from '../../../components/mock/WhyPanel';
import { HitlApprovalCard } from '../../../components/mock/HitlApprovalCard';
import { PaymentReceiptCard } from '../../../components/mock/PaymentReceiptCard';
import { bdt } from '../../../lib/format';
import { caasBasket, caasBalance, nextFertilizerEvent } from '../../../lib/mock-data';

const STATUS_CODE_NOTES: { code: string; note: string }[] = [
  { code: CAAS_STATUS.SUCCESS, note: 'Success' },
  { code: CAAS_STATUS.AUTH_FAILED, note: 'No such active application, or invalid password' },
  { code: CAAS_STATUS.IP_NOT_PROVISIONED, note: 'Originating IP not provisioned' },
  { code: CAAS_STATUS.INVALID_REQUEST, note: 'Missing / malformed mandatory field' },
  { code: CAAS_STATUS.INVALID_MSISDN, note: 'MSISDN invalid or not allowed' },
];

export default function MockCheckoutPage() {
  const { t } = useT();
  const basket = caasBasket();
  const nextEvent = nextFertilizerEvent();
  const [payStep, setPayStep] = useState<0 | 1 | 2>(0);
  const [simulateInsufficient, setSimulateInsufficient] = useState(false);

  const balanceBdt = simulateInsufficient ? Math.max(0, basket.totalBdt - 200) : caasBalance.chargeableBalanceBdt;

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
              {payStep === 0 ? (
                <ToggleButtonGroup
                  label={t('checkout_simulate_toggle')}
                  type="single"
                  value={simulateInsufficient ? 'on' : 'off'}
                  onChange={(v) => setSimulateInsufficient(v === 'on')}
                  size="sm"
                >
                  <ToggleButton value="off" label={t('checkout_charged_to')} />
                  <ToggleButton value="on" label={t('checkout_simulate_toggle')} />
                </ToggleButtonGroup>
              ) : null}

              {payStep === 0 ? (
                <VStack gap={2}>
                  <HitlApprovalCard
                    items={basket.items}
                    totalBdt={basket.totalBdt}
                    balanceBdt={balanceBdt}
                    isInsufficient={simulateInsufficient}
                    onApprove={() => setPayStep(1)}
                    onCancel={() => setPayStep(0)}
                  />
                  <WhyPanel
                    items={[
                      { toolClass: 'external', label: t('checkout_edit_quantities'), description: nextEvent?.title },
                      { toolClass: 'gated', label: t('balance_available'), description: bdt(balanceBdt) },
                    ]}
                  />
                </VStack>
              ) : null}

              {payStep === 1 ? (
                <Card padding={3}>
                  <VStack gap={2}>
                    <ChatToolCalls calls={[{ key: 'debit', name: 'bdapps_direct_debit', status: 'running', target: `${bdt(basket.totalBdt)} · ${caasBalance.msisdn}` }]} />
                    <Button label={t('continue')} variant="primary" onClick={() => setPayStep(2)} />
                  </VStack>
                </Card>
              ) : null}

              {payStep === 2 ? (
                <PaymentReceiptCard
                  amountBdt={basket.totalBdt}
                  msisdn={caasBalance.msisdn}
                  statusCode={CAAS_STATUS.SUCCESS}
                  internalTrxId="INT-demo"
                  referenceId="REF-demo"
                  onReplay={() => setPayStep(0)}
                />
              ) : null}
            </VStack>
          </StackItem>

          <StackItem width={320}>
            <VStack gap={3}>
              <Card padding={3}>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('checkout_ledger_impact')}
                  </Text>
                  <MetadataList>
                    <MetadataListItem label={t('checkout_projected')}>{bdt(basket.totalBdt)}</MetadataListItem>
                    <MetadataListItem label={t('checkout_actual_posted')}>{payStep === 2 ? bdt(basket.totalBdt) : bdt(0)}</MetadataListItem>
                  </MetadataList>
                </VStack>
              </Card>
              <Card padding={3}>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('checkout_status_codes')}
                  </Text>
                  <List hasDividers>
                    {STATUS_CODE_NOTES.map((row) => (
                      <ListItem key={row.code} label={row.code} description={row.note} />
                    ))}
                  </List>
                </VStack>
              </Card>
            </VStack>
          </StackItem>
        </HStack>
      </VStack>
    </AppShell>
  );
}
