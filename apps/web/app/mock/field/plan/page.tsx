// Screen 06/14 of the /mock deck rebuild — season timeline. Per stakeholder feedback
// (screenshot review, 2026-07-24): rebuilt as a horizontally scrollable row of cards
// (previously a vertical List-based timeline) with a button to open an AI chat panel on
// the right half. The outer scroll container uses a narrow, functional-only inline style
// (display/overflow/flex — never a color or token value) since no Astryx primitive
// provides horizontal-scrolling row layout; every color/radius/spacing still comes from
// Astryx components and theme tokens.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { MessageCircle } from 'lucide-react';
import type { PlanEventStatus } from '@agrisense/shared';
import { useT } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { MockRail } from '../../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../../components/mock/SeasonStageStrip';
import { FieldTabsNav } from '../../../../components/mock/FieldTabsNav';
import { WhyPanel } from '../../../../components/mock/WhyPanel';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { shortDate } from '../../../../lib/format';
import { fieldState, planEvents, initialFeed, userMessageFeedItem, genericAckFeedItems, type FeedItem } from '../../../../lib/mock-data';

const STATUS_DOT_VARIANT: Record<PlanEventStatus, 'success' | 'accent' | 'warning' | 'neutral'> = {
  done: 'success',
  shifted: 'warning',
  pending: 'neutral',
  skipped: 'neutral',
};

export default function MockFieldPlanPage() {
  const { t, lang } = useT();
  const { identity } = fieldState;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [composerValue, setComposerValue] = useState('');

  function handleComposerSubmit(value: string) {
    if (!value.trim()) return;
    const idSuffix = String(Date.now());
    setFeed((f) => [...f, userMessageFeedItem(value, idSuffix), ...genericAckFeedItems(idSuffix)]);
    setComposerValue('');
  }

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={3}>
        <HStack justify="between" vAlign="center" wrap="wrap">
          <MetadataList orientation="horizontal" columns="multi" title={identity.name ?? ''}>
            <MetadataListItem label={t('identity_area')}>
              {identity.areaHa} {t('unit_hectare')}
            </MetadataListItem>
          </MetadataList>
          <Button label={t('plan_ask_ai')} variant="secondary" icon={<MessageCircle size={16} />} onClick={() => setIsChatOpen((v) => !v)} />
        </HStack>

        <SeasonStageStrip compact />
        <FieldTabsNav active="plan" />

        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {planEvents.map((ev) => (
                <div key={ev.id} style={{ flex: '0 0 260px', minWidth: 260 }}>
                  <Card padding={3} height={220}>
                    <VStack gap={2}>
                      <HStack justify="between" vAlign="center">
                        <StatusDot variant={STATUS_DOT_VARIANT[ev.status]} label={t(`plan_status_${ev.status}`)} />
                        <Badge variant={ev.status === 'shifted' ? 'yellow' : 'neutral'} label={ev.plannedDate ? shortDate(ev.plannedDate, lang) : t('not_set')} />
                      </HStack>
                      <Text type="label" weight="semibold">
                        {ev.title}
                      </Text>
                      <Text type="supporting" color="secondary">
                        {ev.quantity != null ? `${ev.quantity}${ev.unit ?? ''}` : t(`plan_status_${ev.status}`)}
                      </Text>
                      {ev.shiftReason || ev.sources.length > 0 ? (
                        <WhyPanel
                          items={[
                            ...(ev.shiftReason ? [{ toolClass: 'external' as const, label: t('why_label'), description: ev.shiftReason }] : []),
                            ...ev.sources.map((s) => ({ toolClass: 'deterministic' as const, label: s.source, description: s.reference ?? undefined })),
                          ]}
                        />
                      ) : null}
                    </VStack>
                  </Card>
                </div>
              ))}
            </div>
          </StackItem>

          {isChatOpen ? (
            <StackItem width={380}>
              <Card height={480}>
                <ChatLayout
                  composer={<ChatComposer value={composerValue} onChange={setComposerValue} placeholder={t('composer_placeholder')} onSubmit={handleComposerSubmit} sendButton={<ChatSendButton />} />}
                  emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
                >
                  <ChatMessageList>
                    {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
                  </ChatMessageList>
                </ChatLayout>
              </Card>
            </StackItem>
          ) : null}
        </HStack>
      </VStack>
    </AppShell>
  );
}
