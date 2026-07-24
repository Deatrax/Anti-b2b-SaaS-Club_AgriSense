// Finance tracker — real itemized cost/revenue ledger (GET /fields/:id/plan) with a
// derived headline (lib/financial.ts), a real bdapps checkout entry point, and a real
// scenario simulation ("what if") panel — reuses financial.engine.ts server-side, diffed
// against the live plan (§A.1 T1, Phase 8 backend).
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
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ChatMessage, ChatMessageBubble, ChatToolCalls } from '@astryxdesign/core/Chat';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { bdt, percent } from '../../../../lib/format';
import { computeHeadline } from '../../../../lib/financial';
import {
  getField,
  listFields,
  getFieldPlan,
  postScenario,
  type ApiField,
  type ApiFieldPlanResponse,
  type ApiLedgerLine,
  type ApiScenarioResponse,
} from '../../../../lib/api';

export default function FieldMoneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const { session } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [planData, setPlanData] = useState<ApiFieldPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [budgetCutPct, setBudgetCutPct] = useState<number | null>(40);
  const [scenario, setScenario] = useState<ApiScenarioResponse | null>(null);
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

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

  function handleRunScenario() {
    if (budgetCutPct == null) return;
    setIsRunningScenario(true);
    setScenarioError(null);
    postScenario(id, { label: `budget cut ${budgetCutPct}%`, costMultiplier: 1 - budgetCutPct / 100 })
      .then(setScenario)
      .catch((err) => setScenarioError(String(err)))
      .finally(() => setIsRunningScenario(false));
  }

  if (!session) return null;

  const financial = planData?.financial;
  const lines: ApiLedgerLine[] = financial ? [...financial.actual, ...financial.projected] : [];
  const headline = financial ? computeHeadline(financial) : null;
  const hasFertilizerCosts = financial?.projected.some((l) => l.kind === 'cost') === true;

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

            {hasFertilizerCosts ? (
              <Card padding={3}>
                <HStack justify="between" vAlign="center" wrap="wrap">
                  <VStack gap={0}>
                    <Text type="label" weight="semibold">
                      {t('checkout_title')}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {t('checkout_desc')}
                    </Text>
                  </VStack>
                  <Button label={t('checkout_go')} variant="primary" onClick={() => router.push(`/field/${id}/checkout`)} />
                </HStack>
              </Card>
            ) : null}

            <Card padding={3}>
              <VStack gap={3}>
                <VStack gap={0}>
                  <Text type="label" weight="semibold">
                    {t('scenario_heading')}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {t('scenario_note')}
                  </Text>
                </VStack>

                <ChatMessage sender="user">
                  <ChatMessageBubble variant="filled">{t('scenario_question')}</ChatMessageBubble>
                </ChatMessage>

                <HStack gap={2} vAlign="end" wrap="wrap">
                  <NumberInput label={t('scenario_budget_cut_label')} value={budgetCutPct} onChange={setBudgetCutPct} units="%" min={0} max={100} />
                  <Button label={t('scenario_run')} variant="primary" isDisabled={budgetCutPct == null || isRunningScenario} onClick={handleRunScenario} />
                  {scenario ? <Button label={t('scenario_reset')} variant="ghost" onClick={() => setScenario(null)} /> : null}
                </HStack>

                {isRunningScenario ? (
                  <ChatToolCalls calls={[{ key: 'recompute', name: 'compute_financials', node: 'deterministic', status: 'running' }]} isExpanded />
                ) : null}

                {scenarioError ? <Banner status="error" title={t('login_error_title')} description={scenarioError} /> : null}

                {scenario ? (
                  <VStack gap={2}>
                    <ChatToolCalls
                      calls={[{ key: 'recompute', name: 'compute_financials', node: 'deterministic', status: 'complete' }]}
                    />
                    <Table
                      data={[
                        { id: 'cost', item: t('money_total_cost'), was: bdt(scenario.baseline.totalCost), now: bdt(scenario.scenario.totalCost) },
                        { id: 'net', item: t('money_net_profit'), was: bdt(scenario.baseline.netProfit), now: bdt(scenario.scenario.netProfit) },
                        { id: 'roi', item: t('money_roi'), was: percent(scenario.baseline.roi), now: percent(scenario.scenario.roi) },
                        { id: 'bcr', item: t('money_bcr'), was: scenario.baseline.bcr.toFixed(2), now: scenario.scenario.bcr.toFixed(2) },
                      ]}
                      idKey="id"
                      columns={[
                        { key: 'item', header: t('scenario_line') },
                        { key: 'was', header: t('scenario_was') },
                        { key: 'now', header: t('scenario_now') },
                      ]}
                    />
                  </VStack>
                ) : null}
              </VStack>
            </Card>
          </>
        )}
      </VStack>
    </AppShell>
  );
}
