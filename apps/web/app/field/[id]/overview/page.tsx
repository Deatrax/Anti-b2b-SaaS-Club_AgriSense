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
import { getField, listFields, getFieldPlan, type ApiField, type ApiFieldPlanResponse, type ApiPlanTimelineEntry } from '../../../../lib/api';
import type { FeedItem } from '../../../../lib/feed';

export default function FieldOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, tf } = useT();
  const { session } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [planData, setPlanData] = useState<ApiFieldPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');

  const { feed, sendMessage, isStreaming } = useFieldChat(id);

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

  function handleComposerSubmit(value: string) {
    if (!value.trim()) return;
    sendMessage(value);
    setComposerValue('');
  }

  const forecast = latestWeather(feed);
  const timeline = planData?.plan?.timeline ?? [];
  const upcoming = timeline.filter((e) => e.status === 'pending').slice(0, 2);
  const nextFertilizer = timeline.find((e) => e.title.startsWith('Apply ') && e.status === 'pending') ?? null;
  const financial = planData?.financial;
  const netProfit = financial
    ? [...financial.actual, ...financial.projected].reduce((sum, l) => sum + (l.kind === 'revenue' ? l.total : -l.total), 0)
    : null;

  if (!session) return null;

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail farmName={session.farmName ?? ''} fields={siblingFields} />}
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
          feed={feed}
          sendMessage={sendMessage}
          isStreaming={isStreaming}
          composerValue={composerValue}
          setComposerValue={setComposerValue}
          onComposerSubmit={handleComposerSubmit}
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
  feed,
  sendMessage,
  isStreaming,
  composerValue,
  setComposerValue,
  onComposerSubmit,
}: {
  id: string;
  field: ApiField;
  upcoming: ApiPlanTimelineEntry[];
  nextFertilizer: ApiPlanTimelineEntry | null;
  financial: ApiFieldPlanResponse['financial'] | undefined;
  netProfit: number | null;
  forecast: ReturnType<typeof latestWeather>;
  feed: FeedItem[];
  sendMessage: (message: string) => void;
  isStreaming: boolean;
  composerValue: string;
  setComposerValue: (value: string) => void;
  onComposerSubmit: (value: string) => void;
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
          <StackItem width={420}>
            <Card height={520}>
              <ChatLayout
                composer={
                  <ChatComposer
                    value={composerValue}
                    onChange={setComposerValue}
                    placeholder={t('composer_placeholder')}
                    onSubmit={onComposerSubmit}
                    sendButton={<ChatSendButton />}
                    isDisabled={isStreaming}
                  />
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
          </Grid>
        </StackItem>
      </HStack>

      {isMobile ? <MobileChatOverlay feed={feed} sendMessage={sendMessage} isStreaming={isStreaming} /> : null}
    </VStack>
  );
}
