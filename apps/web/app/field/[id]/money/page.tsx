// Finance tracker — real itemized cost/revenue ledger (GET /fields/:id/plan) with a
// derived headline (lib/financial.ts). No live scenario-recompute yet (Phase 8 backend);
// this shows what's real today rather than fake stepper-driven numbers.
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Table } from '@astryxdesign/core/Table';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { bdt, percent } from '../../../../lib/format';
import { computeHeadline } from '../../../../lib/financial';
import { getField, listFields, getFieldPlan, type ApiField, type ApiFieldPlanResponse, type ApiLedgerLine } from '../../../../lib/api';

export default function FieldMoneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const { session } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [planData, setPlanData] = useState<ApiFieldPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/');
      return;
    }
    getField(id).then(setField).catch((err) => setError(String(err)));
    getFieldPlan(id).then(setPlanData).catch((err) => setError(String(err)));
    if (session.farmId) {
      listFields(session.farmId)
        .then((res) => setSiblingFields(res.fields))
        .catch(() => {});
    }
  }, [id, session, router]);

  if (!session) return null;

  const financial = planData?.financial;
  const lines: ApiLedgerLine[] = financial ? [...financial.actual, ...financial.projected] : [];
  const headline = financial ? computeHeadline(financial) : null;

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail farmName={session.farmName ?? ''} fields={siblingFields} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={3}>
        <VStack gap={0}>
          <Text type="display-3">{t('field_finance_nav')}</Text>
          <Text type="supporting" color="secondary">
            {t('money_finance_desc')}
          </Text>
        </VStack>

        <MetadataList orientation="horizontal" columns="multi" title={field?.name ?? t('field_unnamed')}>
          <MetadataListItem label={t('identity_area')}>{field?.areaHa != null ? `${field.areaHa} ${t('unit_hectare')}` : t('not_set')}</MetadataListItem>
        </MetadataList>

        {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

        {!planData ? (
          <Skeleton height={320} />
        ) : lines.length === 0 ? (
          <Banner status="info" title={t('plan_empty_title')} description={t('money_empty_desc')} />
        ) : (
          <>
            <Table
              data={lines.map((l) => ({
                id: l.id,
                item: l.item,
                detail: l.assumption ?? (l.qty != null ? `${l.qty}${l.unit ?? ''}${l.unitCost != null ? ` @ ${bdt(l.unitCost)}` : ''}` : ''),
                amount: `${l.kind === 'cost' ? '−' : '+'}${bdt(l.total)}`,
              }))}
              idKey="id"
              columns={[
                { key: 'item', header: t('table_item') },
                { key: 'detail', header: t('table_detail') },
                { key: 'amount', header: t('table_amount') },
              ]}
            />

            {headline ? (
              <Card variant="green" padding={3}>
                <VStack gap={1}>
                  <Text type="label" color="secondary">
                    {t('money_net_profit')}
                  </Text>
                  <Text type="display-2" weight="semibold">
                    {bdt(headline.netProfit)}
                  </Text>
                  <HStack gap={2} wrap="wrap">
                    <MetadataList orientation="horizontal" columns="multi">
                      <MetadataListItem label={t('money_total_cost')}>{bdt(headline.totalCost)}</MetadataListItem>
                      <MetadataListItem label={t('money_gross_revenue')}>{bdt(headline.grossRevenue)}</MetadataListItem>
                      {headline.roi != null ? <MetadataListItem label={t('money_roi')}>{percent(headline.roi)}</MetadataListItem> : null}
                      {headline.bcr != null ? <MetadataListItem label={t('money_bcr')}>{headline.bcr.toFixed(2)}</MetadataListItem> : null}
                      {headline.expectedYieldKg != null ? (
                        <MetadataListItem label={t('money_expected_yield')}>{(headline.expectedYieldKg / 1000).toFixed(2)} t</MetadataListItem>
                      ) : null}
                    </MetadataList>
                  </HStack>
                </VStack>
              </Card>
            ) : null}
          </>
        )}
      </VStack>
    </AppShell>
  );
}
