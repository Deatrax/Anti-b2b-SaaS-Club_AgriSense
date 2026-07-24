// Field workspace. Raw Astryx components only, no wrapper components — colors +
// mock data pass over the neutral scaffold. Every component used here comes from
// Docs/inventory_import.md. Content is driven by lib/mock-data.ts (typed against
// @agrisense/shared) so every figure is internally consistent and season-correct
// for "today" (2026-07-24 — Aman rice in the ground, not Boro).
//
// Interactions (composer send, [+Log] irrigation/fertilizer, approve charge) mutate
// local feed state with scripted responses from lib/mock-data.ts, standing in for
// POST /api/chat (SSE) and POST /api/log until apps/api is wired up (§C.1).
'use client';

import { use, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Item } from '@astryxdesign/core/Item';
import { Icon } from '@astryxdesign/core/Icon';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Banner } from '@astryxdesign/core/Banner';
import { List, ListItem } from '@astryxdesign/core/List';
import { Citation } from '@astryxdesign/core/Citation';
import { Popover } from '@astryxdesign/core/Popover';
import { Button } from '@astryxdesign/core/Button';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Table } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import {
  ChatLayout,
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageMetadata,
  ChatToolCalls,
  ChatComposer,
  ChatSendButton,
} from '@astryxdesign/core/Chat';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Receipt, Settings as SettingsIcon } from 'lucide-react';

import { RICE_STAGES } from '@agrisense/shared';
import type { TraceEntry } from '@agrisense/shared';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { bdt, percent, shortDate, daysUntil } from '../../../lib/format';
import {
  fieldState,
  cropCycle,
  planEvents,
  nextPendingEvents,
  activeRiskWindow,
  ledgerEntries,
  financials,
  scenarioFinancials,
  weather,
  initialFeed,
  fieldList,
  southFieldCycle,
  caasBasket,
  caasBalance,
  logIrrigationFeedItems,
  logFertilizerFeedItems,
  approveChargeFeedItems,
  userMessageFeedItem,
  genericAckFeedItems,
  type FeedItem,
} from '../../../lib/mock-data';

type WorkspaceTab = 'overview' | 'plan' | 'money' | 'trace';

const TCLASS_STATUS_VARIANT: Record<TraceEntry['toolClass'], 'success' | 'accent' | 'neutral' | 'warning'> = {
  field: 'success',
  external: 'accent',
  retrieval: 'neutral',
  deterministic: 'accent',
  gated: 'warning',
};

const STAGE_INDEX = cropCycle.stage ? RICE_STAGES.indexOf(cropCycle.stage as (typeof RICE_STAGES)[number]) : -1;
const CYCLE_TOTAL_DAYS =
  cropCycle.sowingDate && cropCycle.expectedHarvest
    ? Math.round((new Date(cropCycle.expectedHarvest).getTime() - new Date(cropCycle.sowingDate).getTime()) / 86_400_000)
    : 150;

function toolCallStatus(status: TraceEntry['status']): 'pending' | 'running' | 'complete' | 'error' {
  if (status === 'ok' || status === 'fallback') return 'complete';
  if (status === 'error') return 'error';
  return status;
}

function formatTarget(params: unknown): string {
  if (params == null || typeof params !== 'object') return '';
  return Object.entries(params as Record<string, unknown>)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(', ');
}

function TraceResultDetail({ trace }: { trace: TraceEntry }) {
  const { t } = useT();
  const rows = trace.result && typeof trace.result === 'object' ? Object.entries(trace.result as Record<string, unknown>) : [];
  return (
    <VStack gap={0.5}>
      {rows.map(([k, v]) => (
        <Text key={k} type="supporting" color="secondary">
          {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </Text>
      ))}
      {trace.source ? (
        <Text type="supporting" color="secondary">
          {t('why_sources')}: {trace.source}
        </Text>
      ) : null}
    </VStack>
  );
}

function FeedTrace({ traces }: { traces: TraceEntry[] }) {
  return (
    <ChatToolCalls
      calls={traces.map((tr) => ({
        key: tr.id,
        name: tr.tool,
        node: tr.toolClass,
        status: toolCallStatus(tr.status),
        target: formatTarget(tr.params),
        duration: tr.durationMs != null ? `${tr.durationMs}ms` : undefined,
        resultDetail: <TraceResultDetail trace={tr} />,
      }))}
    />
  );
}

function FeedMessage({ item }: { item: Extract<FeedItem, { type: 'message' }> }) {
  const { t } = useT();
  const { message } = item;
  return (
    <ChatMessage sender={message.role === 'user' ? 'user' : 'assistant'}>
      <ChatMessageBubble
        variant={message.role === 'user' ? 'filled' : 'ghost'}
        metadata={
          <ChatMessageMetadata
            timestamp={<Timestamp value={message.createdAt} format="relative" />}
            footer={message.isProactive ? t('proactive_marker') : undefined}
          />
        }
      >
        {message.content}
      </ChatMessageBubble>
    </ChatMessage>
  );
}

function FieldRail({ activeId }: { activeId: string }) {
  const { t } = useT();
  return (
    <SideNav header={<SideNavHeading heading={t('app_title')} />}>
      <SideNavSection title={t('farm_fields_heading')}>
        {fieldList.map((f) => (
          <SideNavItem key={f.id} label={f.name} isSelected={f.id === activeId} href={`/field/${f.id}`} />
        ))}
      </SideNavSection>
      <SideNavSection title="" isHeaderHidden>
        <SideNavItem label={t('purchases_title')} icon={Receipt} href="/purchases" />
        <SideNavItem label={t('settings_title')} icon={SettingsIcon} href="/settings" />
      </SideNavSection>
    </SideNav>
  );
}

function NotFoundView() {
  const { t } = useT();
  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail activeId="" />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <EmptyState
        title={t('field_not_found')}
        actions={<Button label={t('back_to_farm')} variant="primary" href="/farm" />}
      />
    </AppShell>
  );
}

function ReadOnlyFieldView() {
  const { t, lang } = useT();
  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail activeId={southFieldCycle.fieldId} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={4}>
        <HStack justify="between" vAlign="center">
          <Text type="display-3">দক্ষিণের জমি</Text>
          <Button label={t('back_to_farm')} variant="secondary" href="/farm" />
        </HStack>
        <Banner status="info" title={t('read_only_banner_title')} description={t('read_only_banner_desc')} />
        <MetadataList orientation="horizontal" columns="multi">
          <MetadataListItem label={t('identity_crop')}>
            {southFieldCycle.crop} · {southFieldCycle.variety}
          </MetadataListItem>
          <MetadataListItem label={t('table_date')}>
            {shortDate(southFieldCycle.sowingDate ?? '', lang)} – {shortDate(southFieldCycle.expectedHarvest ?? '', lang)}
          </MetadataListItem>
          <MetadataListItem label={t('harvested_yield')}>
            {southFieldCycle.actualYieldKg ? `${(southFieldCycle.actualYieldKg / 1000).toFixed(2)} t` : t('not_set')}
          </MetadataListItem>
        </MetadataList>
      </VStack>
    </AppShell>
  );
}

function ActiveFieldWorkspace() {
  const { t, tf, lang } = useT();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [scenarioRun, setScenarioRun] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [logKind, setLogKind] = useState<'irrigation' | 'fertilizer'>('irrigation');
  const [logAmount, setLogAmount] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);

  const { identity } = fieldState;
  const risk = activeRiskWindow();
  const upcoming = nextPendingEvents(2);
  const basket = caasBasket();
  const scenario = scenarioFinancials();
  const allTraces = feed.filter((item): item is Extract<FeedItem, { type: 'tool_trace' }> => item.type === 'tool_trace').flatMap((item) => item.traces);
  const traceClassCounts = allTraces.reduce<Record<string, number>>((acc, tr) => {
    acc[tr.toolClass] = (acc[tr.toolClass] ?? 0) + 1;
    return acc;
  }, {});

  function appendFeed(items: FeedItem[]) {
    setFeed((f) => [...f, ...items]);
  }

  function handleComposerSubmit(value: string) {
    if (!value.trim()) return;
    const idSuffix = String(Date.now());
    appendFeed([userMessageFeedItem(value, idSuffix), ...genericAckFeedItems(idSuffix)]);
    setComposerValue('');
  }

  function handleLogSubmit() {
    if (logAmount == null) return;
    const idSuffix = String(Date.now());
    const unit = logKind === 'irrigation' ? 'mm' : 'kg';
    const cardLabel = logKind === 'irrigation' ? t('card_water') : t('card_fertilizer');
    const responseItems = logKind === 'irrigation' ? logIrrigationFeedItems(logAmount, idSuffix) : logFertilizerFeedItems(logAmount, idSuffix);
    appendFeed([userMessageFeedItem(`${cardLabel}: ${logAmount}${unit}`, idSuffix), ...responseItems]);
    setLogAmount(null);
  }

  function handleApprove() {
    const idSuffix = String(Date.now());
    appendFeed(approveChargeFeedItems(idSuffix));
    setIsApproveOpen(false);
  }

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      sideNav={<FieldRail activeId={identity.id} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack height="100%" gap={0}>
        <StackItem>
          <VStack gap={3} padding={3}>
            <HStack justify="between" vAlign="center">
              <MetadataList orientation="horizontal" columns="multi" title={identity.name ?? ''}>
                <MetadataListItem label={t('identity_soil')}>
                  {identity.soilType ? t(`soil_${identity.soilType}`) : t('not_set')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_water')}>
                  {identity.waterSource ? t(`water_${identity.waterSource}`) : t('not_set')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_area')}>
                  {identity.areaHa} {t('unit_hectare')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_budget')}>
                  {identity.budgetBdt != null ? bdt(identity.budgetBdt) : t('not_set')}
                </MetadataListItem>
              </MetadataList>
              <Button label={t('field_details')} variant="secondary" onClick={() => setIsDetailsOpen(true)} />
            </HStack>

            <HStack gap={2} vAlign="center" wrap="wrap">
              {RICE_STAGES.map((stage, i) => (
                <HStack key={stage} gap={1.5} vAlign="center">
                  {i > 0 ? <Divider orientation="vertical" /> : null}
                  <StatusDot
                    variant={i < STAGE_INDEX ? 'success' : i === STAGE_INDEX ? 'accent' : 'neutral'}
                    label={t(`stage_${stage}`)}
                    isPulsing={i === STAGE_INDEX}
                  />
                  <Text type="supporting">{t(`stage_${stage}`)}</Text>
                </HStack>
              ))}
            </HStack>

            <TabList value={activeTab} onChange={(v) => setActiveTab(v as WorkspaceTab)} hasDivider>
              <Tab value="overview" label={t('tab_overview')} />
              <Tab value="plan" label={t('tab_plan')} />
              <Tab value="money" label={t('tab_money')} />
              <Tab value="trace" label={t('tab_trace')} />
            </TabList>

            {activeTab === 'overview' ? (
              <Grid columns={{ minWidth: 280 }} gap={3}>
                <Card>
                  <VStack gap={2}>
                    <HStack gap={1.5} vAlign="center">
                      <Icon icon="calendar" color="accent" />
                      <Text type="label" weight="semibold">
                        {t('card_next_steps')}
                      </Text>
                    </HStack>
                    {upcoming.length === 0 ? (
                      <Text type="supporting" color="secondary">
                        {t('next_steps_empty')}
                      </Text>
                    ) : (
                      upcoming.map((ev, i) => {
                        const days = ev.plannedDate ? daysUntil(ev.plannedDate) : null;
                        const source = ev.sources[0];
                        return (
                          <Item
                            key={ev.id}
                            label={ev.title}
                            description={days == null ? undefined : days < 0 ? t('overdue') : tf('in_days', { n: days })}
                            endContent={
                              <HStack gap={1.5} vAlign="center">
                                {i === 0 ? <Badge variant="yellow" label={t('next_steps')} /> : null}
                                {source ? (
                                  <Popover
                                    label={t('why_label')}
                                    className={undefined}
                                    style={undefined}
                                    content={
                                      <VStack padding={3} width={260}>
                                        <Text type="supporting">
                                          {ev.title}
                                          {ev.quantity != null ? ` · ${ev.quantity}${ev.unit ?? ''}` : ''} — {source.source}
                                          {source.reference ? ` (${source.reference})` : ''}
                                        </Text>
                                      </VStack>
                                    }
                                  >
                                    <Button label={t('why_label')} variant="ghost" size="sm" />
                                  </Popover>
                                ) : null}
                              </HStack>
                            }
                          />
                        );
                      })
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Text type="label" weight="semibold">
                        {t('card_crop_stage')}
                      </Text>
                      <Badge variant="green" label={cropCycle.stage ? t(`stage_${cropCycle.stage}`) : t('not_set')} />
                    </HStack>
                    <Text type="supporting" color="secondary">
                      {cropCycle.crop} · {cropCycle.variety}
                    </Text>
                    <ProgressBar
                      label={t('card_crop_stage')}
                      isLabelHidden
                      value={cropCycle.dayIndex ?? 0}
                      max={CYCLE_TOTAL_DAYS}
                      variant="success"
                      hasValueLabel
                      formatValueLabel={() => tf('day_progress', { n: cropCycle.dayIndex ?? 0 })}
                    />
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('card_weather')}
                    </Text>
                    <MetadataList orientation="horizontal" columns="multi">
                      <MetadataListItem label={t('weather_temp')}>
                        {weather.tempMinC}–{weather.tempMaxC}°C
                      </MetadataListItem>
                      <MetadataListItem label={t('weather_rain')}>{weather.rainMm7d}mm</MetadataListItem>
                      <MetadataListItem label={t('weather_et0')}>{weather.et0MmDay}mm/d</MetadataListItem>
                    </MetadataList>
                    <Citation source={{ title: weather.source }} number={1} />
                  </VStack>
                </Card>

                {risk ? (
                  <Card>
                    <VStack gap={2}>
                      <Text type="label" weight="semibold">
                        {t('card_risk')}
                      </Text>
                      <Banner
                        status={risk.level === 'high' ? 'error' : 'warning'}
                        title={risk.pest}
                        description={risk.level === 'high' ? t('risk_level_high') : t('risk_level_elevated')}
                      />
                      <Collapsible trigger={<Text type="supporting">{t('why_label')}</Text>}>
                        <List>
                          <ListItem label={t('risk_prevention')} description={risk.prevention ?? undefined} />
                          <ListItem label={t('risk_treatment')} description={risk.treatment ?? undefined} />
                          {risk.estCostBdt != null ? (
                            <ListItem label={t('risk_est_cost')} description={bdt(risk.estCostBdt)} />
                          ) : null}
                        </List>
                      </Collapsible>
                    </VStack>
                  </Card>
                ) : null}
              </Grid>
            ) : activeTab === 'plan' ? (
              <Table
                data={planEvents.map((ev) => ({
                  id: ev.id,
                  label: ev.title,
                  date: ev.plannedDate ? shortDate(ev.plannedDate, lang) : t('not_set'),
                  detail: ev.shiftReason ?? (ev.quantity != null ? `${ev.quantity}${ev.unit ?? ''}` : ''),
                  status: t(`plan_status_${ev.status}`),
                }))}
                idKey="id"
                columns={[
                  { key: 'label', header: t('table_stage') },
                  { key: 'date', header: t('table_date') },
                  { key: 'detail', header: t('table_detail') },
                  { key: 'status', header: t('table_status') },
                ]}
              />
            ) : activeTab === 'money' ? (
              <VStack gap={4}>
                <Table
                  data={ledgerEntries.map((l) => ({
                    id: l.id,
                    item: l.item,
                    detail: l.assumption ?? (l.qty != null ? `${l.qty}${l.unit ?? ''} @ ${l.unitCost != null ? bdt(l.unitCost) : ''}` : ''),
                    amount: `${l.kind === 'cost' ? '−' : '+'}${bdt(l.total)}`,
                  }))}
                  idKey="id"
                  columns={[
                    { key: 'item', header: t('table_item') },
                    { key: 'detail', header: t('table_detail') },
                    { key: 'amount', header: t('table_amount') },
                  ]}
                />

                <Card variant="green" padding={3}>
                  <VStack gap={1}>
                    <Text type="label" color="secondary">
                      {t('money_net_profit')}
                    </Text>
                    <Text type="display-2" weight="semibold">
                      {bdt(financials.netProfit)}
                    </Text>
                    <HStack gap={2} wrap="wrap">
                      <MetadataList orientation="horizontal" columns="multi">
                        <MetadataListItem label={t('money_roi')}>{percent(financials.roi)}</MetadataListItem>
                        <MetadataListItem label={t('money_bcr')}>{financials.bcr.toFixed(2)}</MetadataListItem>
                        <MetadataListItem label={t('money_breakeven')}>
                          {(financials.breakEvenYieldKg / 1000).toFixed(2)} t
                        </MetadataListItem>
                      </MetadataList>
                    </HStack>
                  </VStack>
                </Card>

                {basket.items.length > 0 ? (
                  <Card variant="yellow" padding={3}>
                    <VStack gap={2}>
                      <Text type="label" weight="semibold">
                        {t('approve_charge_title')}
                      </Text>
                      <Text type="supporting">{tf('approve_charge_desc', { amount: bdt(basket.totalBdt) })}</Text>
                      <List hasDividers>
                        {basket.items.map((row) => (
                          <ListItem
                            key={row.item}
                            label={`${row.item} · ${row.qty} ${row.unit} @ ${bdt(row.unitCostBdt)}`}
                            endContent={<Text type="supporting">{bdt(row.totalBdt)}</Text>}
                          />
                        ))}
                      </List>
                      <Text type="supporting" color="secondary">
                        {t('balance_available')}: {bdt(caasBalance.chargeableBalanceBdt)}
                      </Text>
                      <Button
                        label={tf('approve_charge_button', { amount: bdt(basket.totalBdt) })}
                        variant="primary"
                        onClick={() => setIsApproveOpen(true)}
                      />
                    </VStack>
                  </Card>
                ) : null}

                <Card padding={3}>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('scenario_heading')}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {t('scenario_question')}
                    </Text>
                    {!scenarioRun ? (
                      <Button label={t('scenario_run')} variant="secondary" onClick={() => setScenarioRun(true)} />
                    ) : (
                      <VStack gap={2}>
                        <Table
                          data={scenario.lineItems
                            .filter((l) => l.kind === 'cost')
                            .map((l) => {
                              const was = financials.lineItems.find((b) => b.id === l.id)?.total ?? l.total;
                              return { id: l.id, item: l.item, was: bdt(was), now: bdt(l.total) };
                            })
                            .concat([
                              { id: 'total', item: t('money_total_cost'), was: bdt(financials.totalCost), now: bdt(scenario.totalCost) },
                              { id: 'net', item: t('money_net_profit'), was: bdt(financials.netProfit), now: bdt(scenario.netProfit) },
                            ])}
                          idKey="id"
                          columns={[
                            { key: 'item', header: t('scenario_line') },
                            { key: 'was', header: t('scenario_was') },
                            { key: 'now', header: t('scenario_now') },
                          ]}
                        />
                        <Text type="supporting" color="secondary">
                          {t('scenario_note')}
                        </Text>
                        <Button label={t('scenario_reset')} variant="ghost" onClick={() => setScenarioRun(false)} />
                      </VStack>
                    )}
                  </VStack>
                </Card>
              </VStack>
            ) : (
              <VStack gap={4}>
                <Table
                  data={allTraces.map((tr) => ({
                    id: tr.id,
                    tool: tr.tool,
                    toolClass: t(`trace_class_${tr.toolClass}`),
                    io: `${formatTarget(tr.params)} → ${formatTarget(tr.result)}`,
                    duration: tr.durationMs != null ? `${tr.durationMs}ms` : '',
                  }))}
                  idKey="id"
                  columns={[
                    { key: 'toolClass', header: t('table_class') },
                    { key: 'tool', header: t('table_item') },
                    { key: 'io', header: t('table_params_result') },
                    { key: 'duration', header: t('table_duration') },
                  ]}
                />
                {allTraces.length === 0 ? <Text type="supporting" color="secondary">{t('trace_empty')}</Text> : null}

                <Grid columns={{ minWidth: 240 }} gap={3}>
                  <Card padding={3}>
                    <VStack gap={2}>
                      <Text type="label" weight="semibold">
                        {t('trace_rows_heading')}
                      </Text>
                      <MetadataList orientation="horizontal" columns="multi">
                        <MetadataListItem label={t('trace_total_calls')}>{allTraces.length}</MetadataListItem>
                        {(['field', 'external', 'retrieval', 'deterministic', 'gated'] as const).map((cls) => (
                          <MetadataListItem key={cls} label={t(`trace_class_${cls}`)}>
                            {traceClassCounts[cls] ?? 0}
                          </MetadataListItem>
                        ))}
                      </MetadataList>
                      <Text type="supporting" color="secondary">
                        {t('trace_model_numbers')}: 0
                      </Text>
                    </VStack>
                  </Card>
                  <Card padding={3}>
                    <VStack gap={2}>
                      <Text type="label" weight="semibold">
                        {t('trace_legend_heading')}
                      </Text>
                      <List hasDividers>
                        {(['field', 'external', 'retrieval', 'deterministic', 'gated'] as const).map((cls) => (
                          <ListItem key={cls} label={t(`trace_class_${cls}`)} startContent={<StatusDot variant={TCLASS_STATUS_VARIANT[cls]} label={cls} />} />
                        ))}
                      </List>
                    </VStack>
                  </Card>
                </Grid>
              </VStack>
            )}
          </VStack>
        </StackItem>

        <StackItem size="fill">
          <ChatLayout
            composer={
              <VStack gap={2}>
                <Card variant="muted" padding={2}>
                  <VStack gap={1.5}>
                    <ToggleButtonGroup
                      label={t('chips_label')}
                      type="single"
                      value={logKind}
                      onChange={(v) => v && setLogKind(v as 'irrigation' | 'fertilizer')}
                      size="sm"
                    >
                      <ToggleButton value="irrigation" label={t('card_water')} />
                      <ToggleButton value="fertilizer" label={t('card_fertilizer')} />
                    </ToggleButtonGroup>
                    <HStack gap={2} vAlign="end">
                      <NumberInput
                        label={t('log_amount_label')}
                        isLabelHidden
                        value={logAmount}
                        onChange={setLogAmount}
                        units={logKind === 'irrigation' ? 'mm' : 'kg'}
                        placeholder="0"
                      />
                      <Button label={t('log_action')} variant="secondary" isDisabled={logAmount == null} onClick={handleLogSubmit} />
                    </HStack>
                  </VStack>
                </Card>
                <ChatComposer
                  value={composerValue}
                  onChange={setComposerValue}
                  placeholder={t('composer_placeholder')}
                  onSubmit={handleComposerSubmit}
                  sendButton={<ChatSendButton />}
                />
              </VStack>
            }
            emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
          >
            <ChatMessageList>
              {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
            </ChatMessageList>
          </ChatLayout>
        </StackItem>
      </VStack>

      <Dialog isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <Layout
          header={<DialogHeader title={identity.name ?? ''} onOpenChange={setIsDetailsOpen} />}
          content={
            <LayoutContent>
              <MetadataList>
                <MetadataListItem label={t('identity_soil')}>
                  {identity.soilType ? t(`soil_${identity.soilType}`) : t('not_set')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_water')}>
                  {identity.waterSource ? t(`water_${identity.waterSource}`) : t('not_set')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_area')}>
                  {identity.areaHa} {t('unit_hectare')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_crop')}>
                  {cropCycle.crop} · {cropCycle.variety}
                </MetadataListItem>
                <MetadataListItem label={t('identity_budget')}>
                  {identity.budgetBdt != null ? bdt(identity.budgetBdt) : t('not_set')}
                </MetadataListItem>
              </MetadataList>
            </LayoutContent>
          }
        />
      </Dialog>

      <AlertDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title={t('approve_charge_confirm_title')}
        description={tf('approve_charge_confirm_desc', { amount: bdt(basket.totalBdt), msisdn: caasBalance.msisdn })}
        actionLabel={t('approve_action')}
        actionVariant="primary"
        onAction={handleApprove}
      />
    </AppShell>
  );
}

export default function FieldWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (id === fieldState.identity.id) return <ActiveFieldWorkspace />;
  if (id === southFieldCycle.fieldId) return <ReadOnlyFieldView />;
  return <NotFoundView />;
}
