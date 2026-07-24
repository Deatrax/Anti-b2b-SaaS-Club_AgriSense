// Dedicated full-page chat, separate from Overview's embedded half-chat panel — per
// stakeholder feedback (screenshot review, 2026-07-24): "A dedicated chat page." Same
// interactive composer + quick-log pattern as Overview and app/field/[id]/page.tsx, just
// given the whole stage instead of half of it.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useT } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { MockRail } from '../../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../../components/mock/SeasonStageStrip';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { fieldState, initialFeed, logIrrigationFeedItems, logFertilizerFeedItems, userMessageFeedItem, genericAckFeedItems, type FeedItem } from '../../../../lib/mock-data';

export default function MockFieldChatPage() {
  const { t } = useT();
  const { identity } = fieldState;
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
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
    <AppShell height="fill" contentPadding={0} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack height="100%" gap={0}>
        <StackItem>
          <VStack gap={2} padding={3}>
            <Text type="display-3">{identity.name}</Text>
            <SeasonStageStrip compact />
          </VStack>
        </StackItem>

        <StackItem size="fill">
          <HStack height="100%" gap={0}>
            <StackItem size="fill">
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
                emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
              >
                <ChatMessageList>
                  {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
                </ChatMessageList>
              </ChatLayout>
            </StackItem>
          </HStack>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
