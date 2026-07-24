// Screen 05/14 of the /mock deck rebuild — the MAINTAINING-phase hub. Adapted from
// app/field/[id]/page.tsx's `activeTab === 'overview'` branch (new file, that page is
// untouched). Per stakeholder feedback (screenshot review, 2026-07-24): a real half-chat/
// half-cards split (interactive composer, not a static feed), a fertilizer tracker card,
// and a weather card that opens a full-page modal with expanded detail instead of just
// showing a few numbers inline.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
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
import { List, ListItem } from '@astryxdesign/core/List';
import { Citation } from '@astryxdesign/core/Citation';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { FlaskConical } from 'lucide-react';
import { useT } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { MockRail } from '../../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../../components/mock/SeasonStageStrip';
import { FieldTabsNav } from '../../../../components/mock/FieldTabsNav';
import { WeatherDialog } from '../../../../components/mock/WeatherDialog';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { bdt, percent, shortDate, daysUntil } from '../../../../lib/format';
import {
  fieldState,
  activeRiskWindow,
  nextPendingEvents,
  nextFertilizerEvent,
  weather,
  initialFeed,
  financials,
  logIrrigationFeedItems,
  logFertilizerFeedItems,
  userMessageFeedItem,
  genericAckFeedItems,
  type FeedItem,
} from '../../../../lib/mock-data';

export default function MockFieldOverviewPage() {
  const { t, tf, lang } = useT();
  const { identity } = fieldState;
  const risk = activeRiskWindow();
  const upcoming = nextPendingEvents(2);
  const nextFertilizer = nextFertilizerEvent();

  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [logKind, setLogKind] = useState<'irrigation' | 'fertilizer'>('irrigation');
  const [logAmount, setLogAmount] = useState<number | null>(null);

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

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={3}>
        <MetadataList orientation="horizontal" columns="multi" title={identity.name ?? ''}>
          <MetadataListItem label={t('identity_soil')}>{identity.soilType ? t(`soil_${identity.soilType}`) : t('not_set')}</MetadataListItem>
          <MetadataListItem label={t('identity_water')}>{identity.waterSource ? t(`water_${identity.waterSource}`) : t('not_set')}</MetadataListItem>
          <MetadataListItem label={t('identity_area')}>
            {identity.areaHa} {t('unit_hectare')}
          </MetadataListItem>
        </MetadataList>

        <SeasonStageStrip />
        <FieldTabsNav active="overview" />

        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem width={420}>
            <Card height={520}>
              <ChatLayout
                composer={
                  <VStack gap={2}>
                    <Card variant="muted" padding={2}>
                      <VStack gap={1.5}>
                        <ToggleButtonGroup label={t('chips_label')} type="single" value={logKind} onChange={(v) => v && setLogKind(v as 'irrigation' | 'fertilizer')} size="sm">
                          <ToggleButton value="irrigation" label={t('card_water')} />
                          <ToggleButton value="fertilizer" label={t('card_fertilizer')} />
                        </ToggleButtonGroup>
                        <HStack gap={2} vAlign="end">
                          <NumberInput label={t('log_amount_label')} isLabelHidden value={logAmount} onChange={setLogAmount} units={logKind === 'irrigation' ? 'mm' : 'kg'} placeholder="0" />
                          <Button label={t('log_action')} variant="secondary" isDisabled={logAmount == null} onClick={handleLogSubmit} />
                        </HStack>
                      </VStack>
                    </Card>
                    <ChatComposer value={composerValue} onChange={setComposerValue} placeholder={t('composer_placeholder')} onSubmit={handleComposerSubmit} sendButton={<ChatSendButton />} />
                  </VStack>
                }
              >
                <ChatMessageList>
                  {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
                </ChatMessageList>
              </ChatLayout>
            </Card>
          </StackItem>

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
                      const days = ev.plannedDate ? daysUntil(ev.plannedDate) : null;
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

              <Card>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('card_weather')}
                  </Text>
                  <HStack gap={1.5} vAlign="center">
                    <Icon icon="info" color="accent" size="lg" />
                    <Text type="display-3">
                      {weather.tempMinC}–{weather.tempMaxC}°C
                    </Text>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {tf('weather_rain_probability', { n: weather.rainProbabilityMax })}
                  </Text>
                  <Button label={t('weather_view_details')} variant="ghost" size="sm" endContent={<Icon icon="chevronRight" size="xsm" />} onClick={() => setIsWeatherOpen(true)} />
                </VStack>
              </Card>

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
                        {nextFertilizer.title} · {nextFertilizer.quantity}
                        {nextFertilizer.unit}
                      </Text>
                      <Text type="supporting" color="secondary">
                        {nextFertilizer.plannedDate ? tf('fertilizer_next_dose_on', { date: shortDate(nextFertilizer.plannedDate, lang) }) : t('not_set')}
                      </Text>
                    </>
                  ) : (
                    <Text type="supporting" color="secondary">
                      {t('fertilizer_none_pending')}
                    </Text>
                  )}
                </VStack>
              </Card>

              {risk ? (
                <Card>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('card_risk')}
                    </Text>
                    <Banner status={risk.level === 'high' ? 'error' : 'warning'} title={risk.pest} description={risk.level === 'high' ? t('risk_level_high') : t('risk_level_elevated')} />
                    <Collapsible trigger={<Text type="supporting">{t('why_label')}</Text>}>
                      <List>
                        <ListItem label={t('risk_prevention')} description={risk.prevention ?? undefined} />
                        <ListItem label={t('risk_treatment')} description={risk.treatment ?? undefined} />
                        {risk.estCostBdt != null ? <ListItem label={t('risk_est_cost')} description={bdt(risk.estCostBdt)} /> : null}
                      </List>
                    </Collapsible>
                  </VStack>
                </Card>
              ) : null}

              <Card>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('money_net_profit')}
                  </Text>
                  <Text type="display-3">{bdt(financials.netProfit)}</Text>
                  <MetadataList orientation="horizontal" columns="multi">
                    <MetadataListItem label={t('money_roi')}>{percent(financials.roi)}</MetadataListItem>
                    <MetadataListItem label={t('money_bcr')}>{financials.bcr.toFixed(2)}</MetadataListItem>
                  </MetadataList>
                </VStack>
              </Card>
            </Grid>
          </StackItem>
        </HStack>
      </VStack>

      <WeatherDialog isOpen={isWeatherOpen} onOpenChange={setIsWeatherOpen} />
    </AppShell>
  );
}
