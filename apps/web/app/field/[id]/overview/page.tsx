// Field workspace — Overview. Real half-chat/half-cards split (interactive composer, live
// SSE), a fertilizer tracker card, and a weather card that opens a full-page modal — per
// stakeholder feedback (screenshot review). Wired to the real backend: GET /fields/:id,
// GET /fields/:id/plan, POST /api/chat (SSE via lib/useFieldChat).
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, useAppShellMobile } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Item } from '@astryxdesign/core/Item';
import { Icon } from '@astryxdesign/core/Icon';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { List, ListItem } from '@astryxdesign/core/List';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { FlaskConical } from 'lucide-react';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { WeatherPanel } from '../../../../components/WeatherPanel';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { MobileChatOverlay } from '../../../../components/MobileChatOverlay';
import { useFieldChat } from '../../../../lib/useFieldChat';
import { latestWeather } from '../../../../lib/weather';
import { bdt, daysFromToday } from '../../../../lib/format';
import {
  getField,
  listFields,
  listRecentChats,
  getFieldPlan,
  postFieldLog,
  type ApiField,
  type ApiFieldPlanResponse,
  type ApiPlanTimelineEntry,
  type ApiRiskWindow,
  type ApiReplanDiff,
  type ApiRecentChat,
} from '../../../../lib/api';
import type { FeedItem } from '../../../../lib/feed';

export default function FieldOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, tf } = useT();
  const { session, isHydrated } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [recentChats, setRecentChats] = useState<ApiRecentChat[]>([]);
  const [planData, setPlanData] = useState<ApiFieldPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');
  const [logKind, setLogKind] = useState<'irrigation' | 'fertilizer' | 'observation'>('irrigation');
  const [logAmount, setLogAmount] = useState<number | null>(null);
  const [logResult, setLogResult] = useState<ApiReplanDiff | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const { feed, sendMessage, isStreaming } = useFieldChat(id);

  useEffect(() => {
    if (!isHydrated) return;
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
      listRecentChats(session.farmId)
        .then((res) => setRecentChats(res.chats))
        .catch(() => {});
    }
  }, [id, isHydrated, session, router]);

  function handleComposerSubmit(value: string) {
    if (!value.trim()) return;
    sendMessage(value);
    setComposerValue('');
  }

  function handleLogSubmit() {
    if (logAmount == null) return;
    setIsLogging(true);
    setLogResult(null);
    const unit = logKind === 'irrigation' ? 'mm' : logKind === 'fertilizer' ? 'kg' : undefined;
    postFieldLog(id, logKind, { quantity: logAmount, unit })
      .then((res) => {
        setLogResult(res.diff);
        setLogAmount(null);
        getFieldPlan(id).then(setPlanData).catch(() => {});
      })
      .catch((err) => setError(String(err)))
      .finally(() => setIsLogging(false));
  }

  const forecast = latestWeather(feed);
  const timeline = planData?.plan?.timeline ?? [];
  const upcoming = timeline.filter((e) => e.status === 'pending').slice(0, 2);
  const nextFertilizer = timeline.find((e) => e.title.startsWith('Apply ') && e.status === 'pending') ?? null;
  const financial = planData?.financial;
  const netProfit = financial
    ? [...financial.actual, ...financial.projected].reduce((sum, l) => sum + (l.kind === 'revenue' ? l.total : -l.total), 0)
    : null;

  if (!isHydrated || !session) return null;

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={
        <FieldRail
          farmName={session.farmName ?? ''}
          farmDistrict={session.farmDistrict}
          farmAez={session.farmAez}
          fields={siblingFields}
          activeFieldId={id}
          recentChats={recentChats}
        />
      }
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}
      {!field ? (
        <VStack gap={3}>
          <Skeleton height={40} />
          <Skeleton height={400} />
        </VStack>
      ) : (
        <OverviewBody
          id={id}
          field={field}
          upcoming={upcoming}
          nextFertilizer={nextFertilizer}
          financial={financial}
          netProfit={netProfit}
          forecast={forecast}
          risk={planData?.risk ?? []}
          feed={feed}
          sendMessage={sendMessage}
          isStreaming={isStreaming}
          composerValue={composerValue}
          setComposerValue={setComposerValue}
          onComposerSubmit={handleComposerSubmit}
          logKind={logKind}
          setLogKind={setLogKind}
          logAmount={logAmount}
          setLogAmount={setLogAmount}
          logResult={logResult}
          isLogging={isLogging}
          onLogSubmit={handleLogSubmit}
        />
      )}
    </AppShell>
  );
}

function OverviewBody({
  id,
  field,
  upcoming,
  nextFertilizer,
  financial,
  netProfit,
  forecast,
  risk,
  feed,
  sendMessage,
  isStreaming,
  composerValue,
  setComposerValue,
  onComposerSubmit,
  logKind,
  setLogKind,
  logAmount,
  setLogAmount,
  logResult,
  isLogging,
  onLogSubmit,
}: {
  id: string;
  field: ApiField;
  upcoming: ApiPlanTimelineEntry[];
  nextFertilizer: ApiPlanTimelineEntry | null;
  financial: ApiFieldPlanResponse['financial'] | undefined;
  netProfit: number | null;
  forecast: ReturnType<typeof latestWeather>;
  risk: ApiRiskWindow[];
  feed: FeedItem[];
  sendMessage: (message: string) => void;
  isStreaming: boolean;
  composerValue: string;
  setComposerValue: (value: string) => void;
  onComposerSubmit: (value: string) => void;
  logKind: 'irrigation' | 'fertilizer' | 'observation';
  setLogKind: (kind: 'irrigation' | 'fertilizer' | 'observation') => void;
  logAmount: number | null;
  setLogAmount: (value: number | null) => void;
  logResult: ApiReplanDiff | null;
  isLogging: boolean;
  onLogSubmit: () => void;
}) {
  const { t, tf } = useT();
  const { isMobile } = useAppShellMobile();

  return (
    <VStack gap={3}>
      <MetadataList orientation="horizontal" columns="multi" title={field.name ?? t('field_unnamed')}>
        <MetadataListItem label={t('identity_soil')}>{field.soilType ? t(`soil_${field.soilType}`) : t('not_set')}</MetadataListItem>
        <MetadataListItem label={t('identity_water')}>{field.waterSource ? t(`water_${field.waterSource}`) : t('not_set')}</MetadataListItem>
        <MetadataListItem label={t('identity_area')}>{field.areaHa != null ? `${field.areaHa} ${t('unit_hectare')}` : t('not_set')}</MetadataListItem>
      </MetadataList>

      {field.missingFields.length > 0 ? (
        <Banner status="info" title={t('gathering_banner_title')} description={tf('gathering_banner_desc', { n: field.missingFields.length })} />
      ) : null}

      <HStack gap={4} vAlign="start" wrap="wrap">
        {!isMobile ? (
          <StackItem>
            <Card width={420} height={520}>
              <ChatLayout
                composer={
                  <VStack gap={2}>
                    <Card variant="muted" padding={2}>
                      <VStack gap={1.5}>
                        <ToggleButtonGroup label={t('chips_label')} type="single" value={logKind} onChange={(v) => v && setLogKind(v as typeof logKind)} size="sm">
                          <ToggleButton value="irrigation" label={t('card_water')} />
                          <ToggleButton value="fertilizer" label={t('card_fertilizer')} />
                          <ToggleButton value="observation" label={t('log_kind_observation')} />
                        </ToggleButtonGroup>
                        <HStack gap={2} vAlign="end">
                          <NumberInput
                            label={t('log_amount_label')}
                            isLabelHidden
                            value={logAmount}
                            onChange={setLogAmount}
                            units={logKind === 'irrigation' ? 'mm' : logKind === 'fertilizer' ? 'kg' : undefined}
                            placeholder="0"
                          />
                          <Button label={t('log_action')} variant="secondary" isDisabled={logAmount == null || isLogging} onClick={onLogSubmit} />
                        </HStack>
                        {logResult ? (
                          <Text type="supporting" color="secondary">
                            {logResult.shiftedEvents.length > 0 || logResult.costChanged
                              ? tf('log_replan_summary', { n: logResult.shiftedEvents.length })
                              : t('log_replan_none')}
                          </Text>
                        ) : null}
                      </VStack>
                    </Card>
                    <ChatComposer
                      value={composerValue}
                      onChange={setComposerValue}
                      placeholder={t('composer_placeholder')}
                      onSubmit={onComposerSubmit}
                      sendButton={<ChatSendButton />}
                      isDisabled={isStreaming}
                    />
                  </VStack>
                }
                emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
              >
                <ChatMessageList>
                  {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
                </ChatMessageList>
              </ChatLayout>
            </Card>
          </StackItem>
        ) : null}

        <StackItem size="fill">
          <Grid columns={{ minWidth: 260 }} gap={3}>
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
                    const days = ev.plannedDate ? daysFromToday(ev.plannedDate) : null;
                    return (
                      <Item
                        key={ev.id}
                        label={ev.title}
                        description={days == null ? undefined : days < 0 ? t('overdue') : tf('in_days', { n: days })}
                        endContent={i === 0 ? <Badge variant="yellow" label={t('next_steps')} /> : undefined}
                      />
                    );
                  })
                )}
              </VStack>
            </Card>

            <WeatherPanel forecast={forecast} onAskWeather={() => sendMessage(t('weather_check_prompt'))} />

            <Card>
              <VStack gap={2}>
                <HStack gap={1.5} vAlign="center">
                  <Icon icon={FlaskConical} color="accent" />
                  <Text type="label" weight="semibold">
                    {t('card_fertilizer_tracker')}
                  </Text>
                </HStack>
                {nextFertilizer ? (
                  <>
                    <Text type="supporting">
                      {nextFertilizer.title}
                      {nextFertilizer.quantity != null ? ` · ${nextFertilizer.quantity}${nextFertilizer.unit ?? ''}` : ''}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {nextFertilizer.plannedDate ? tf('fertilizer_next_dose_on_raw', { date: nextFertilizer.plannedDate }) : t('not_set')}
                    </Text>
                  </>
                ) : (
                  <Text type="supporting" color="secondary">
                    {t('fertilizer_none_pending')}
                  </Text>
                )}
              </VStack>
            </Card>

            {financial ? (
              <Card>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('money_net_profit')}
                  </Text>
                  <Text type="display-3">{netProfit != null ? bdt(netProfit) : t('not_set')}</Text>
                  <Button label={t('field_finance_nav')} variant="ghost" size="sm" href={`/field/${id}/money`} />
                </VStack>
              </Card>
            ) : null}

            {risk.length > 0 ? (
              <Card>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('card_risk')}
                  </Text>
                  {risk.map((r) => (
                    <VStack key={r.id} gap={1.5}>
                      <Banner
                        status={r.level === 'high' ? 'error' : 'warning'}
                        title={r.pest}
                        description={r.level === 'high' ? t('risk_level_high') : r.level === 'elevated' ? t('risk_level_elevated') : t('risk_level_low')}
                      />
                      <Collapsible trigger={<Text type="supporting">{t('why_label')}</Text>}>
                        <List>
                          {r.prevention ? <ListItem label={t('risk_prevention')} description={r.prevention} /> : null}
                          {r.treatment ? <ListItem label={t('risk_treatment')} description={r.treatment} /> : null}
                          {r.estCostBdt != null ? <ListItem label={t('risk_est_cost')} description={bdt(r.estCostBdt)} /> : null}
                        </List>
                      </Collapsible>
                    </VStack>
                  ))}
                </VStack>
              </Card>
            ) : null}
          </Grid>
        </StackItem>
      </HStack>

      {isMobile ? <MobileChatOverlay feed={feed} sendMessage={sendMessage} isStreaming={isStreaming} /> : null}
    </VStack>
  );
}
