// Screen 09/14 of the /mock deck rebuild — edit-and-replan closed loop demo. FieldTabsNav
// highlights "overview" per the mock's own fieldTabs('overview', true) choice, even though
// this is a distinct URL — Replan is a variant of the Overview loop, not a sixth tab the
// mock ever defines. The composer is wired to lib/mock-data.ts's logIrrigationFeedItems()
// so the loop is actually demonstrable, not just decorative.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Button } from '@astryxdesign/core/Button';
import { ChatLayout, ChatMessageList } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Droplet } from 'lucide-react';
import { useT } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { MockRail } from '../../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../../components/mock/SeasonStageStrip';
import { FieldTabsNav } from '../../../../components/mock/FieldTabsNav';
import { WhyPanel } from '../../../../components/mock/WhyPanel';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { logIrrigationFeedItems, userMessageFeedItem, type FeedItem } from '../../../../lib/mock-data';

export default function MockFieldReplanPage() {
  const { t } = useT();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [amount, setAmount] = useState<number | null>(null);

  function handleLog() {
    if (amount == null) return;
    const idSuffix = String(Date.now());
    setFeed((f) => [...f, userMessageFeedItem(`${t('card_water')}: ${amount}mm`, idSuffix), ...logIrrigationFeedItems(amount, idSuffix)]);
    setAmount(null);
  }

  const hasLogged = feed.length > 0;

  return (
    <AppShell height="fill" contentPadding={0} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack height="100%" gap={0}>
        <StackItem>
          <VStack gap={3} padding={3}>
            <Text type="display-3">{t('replan_title')}</Text>
            <Text type="supporting" color="secondary">
              {t('replan_desc')}
            </Text>
            <SeasonStageStrip compact />
            <FieldTabsNav active="overview" />
          </VStack>
        </StackItem>

        <StackItem size="fill">
          <HStack height="100%" gap={0}>
            <StackItem size="fill">
              <ChatLayout
                composer={
                  <HStack gap={2} vAlign="end">
                    <NumberInput label={t('log_amount_label')} isLabelHidden value={amount} onChange={setAmount} units="mm" placeholder="0" />
                    <Button label={t('log_action')} variant="primary" isDisabled={amount == null} onClick={handleLog} />
                  </HStack>
                }
                emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
              >
                <ChatMessageList>
                  {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
                </ChatMessageList>
              </ChatLayout>
            </StackItem>

            <StackItem>
              <div style={{ width: 320 }}>
                <VStack gap={3} padding={3}>
                  <Card>
                    <VStack gap={2}>
                      <HStack gap={1.5} vAlign="center">
                        <Icon icon={Droplet} color="accent" />
                        <Text type="label" weight="semibold">
                          {t('card_water')}
                        </Text>
                      </HStack>
                      <Text type="supporting" color="secondary">
                        {hasLogged ? t('replan_water_updated_badge') : t('log_none_yet')}
                      </Text>
                    </VStack>
                  </Card>
                  <WhyPanel items={[{ toolClass: 'field', label: t('replan_scoped_note_title'), description: t('replan_scoped_note_desc') }]} />
                </VStack>
              </div>
            </StackItem>
          </HStack>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
