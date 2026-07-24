// Season timeline — a vertical dated list of stages (per the v2 desktop mockup's Plan tab),
// each with status, quantities, a "Done" button, and a Why panel; a button opens an AI chat
// panel on the right half for questions about the plan.
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, useAppShellMobile } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { MessageCircle } from 'lucide-react';
import type { PlanEventStatus } from '@agrisense/shared';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { WhyPanel } from '../../../../components/mock/WhyPanel';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { MobileChatOverlay } from '../../../../components/MobileChatOverlay';
import { useFieldChat } from '../../../../lib/useFieldChat';
import {
  getField,
  listFields,
  listRecentChats,
  getFieldPlan,
  markPlanEventDone,
  type ApiField,
  type ApiFieldPlanResponse,
  type ApiPlanTimelineEntry,
  type ApiRecentChat,
} from '../../../../lib/api';
import type { FeedItem } from '../../../../lib/feed';

const STATUS_DOT_VARIANT: Record<PlanEventStatus, 'success' | 'accent' | 'warning' | 'neutral'> = {
  done: 'success',
  shifted: 'warning',
  pending: 'neutral',
  skipped: 'neutral',
};

export default function FieldPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const { session, isHydrated } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [recentChats, setRecentChats] = useState<ApiRecentChat[]>([]);
  const [planData, setPlanData] = useState<ApiFieldPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [cycleJustCompleted, setCycleJustCompleted] = useState(false);

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

  function handleMarkDone(eventId: string) {
    markPlanEventDone(eventId)
      .then(({ cycleCompleted }) => {
        setCycleJustCompleted(cycleCompleted);
        return getFieldPlan(id).then(setPlanData);
      })
      .catch((err) => setError(String(err)));
  }

  if (!isHydrated || !session) return null;

  const timeline = planData?.plan?.timeline ?? [];

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
      <PlanBody
        field={field}
        timeline={timeline}
        planLoaded={planData != null}
        error={error}
        cycleJustCompleted={cycleJustCompleted}
        onMarkDone={handleMarkDone}
        feed={feed}
        sendMessage={sendMessage}
        isStreaming={isStreaming}
        composerValue={composerValue}
        setComposerValue={setComposerValue}
        onComposerSubmit={handleComposerSubmit}
      />
    </AppShell>
  );
}

function PlanBody({
  field,
  timeline,
  planLoaded,
  error,
  cycleJustCompleted,
  onMarkDone,
  feed,
  sendMessage,
  isStreaming,
  composerValue,
  setComposerValue,
  onComposerSubmit,
}: {
  field: ApiField | null;
  timeline: ApiPlanTimelineEntry[];
  planLoaded: boolean;
  error: string | null;
  cycleJustCompleted: boolean;
  onMarkDone: (eventId: string) => void;
  feed: FeedItem[];
  sendMessage: (message: string) => void;
  isStreaming: boolean;
  composerValue: string;
  setComposerValue: (value: string) => void;
  onComposerSubmit: (value: string) => void;
}) {
  const { t } = useT();
  const { isMobile } = useAppShellMobile();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <VStack gap={3}>
      <HStack justify="between" vAlign="center" wrap="wrap">
        <MetadataList orientation="horizontal" columns="multi" title={field?.name ?? t('field_unnamed')}>
          <MetadataListItem label={t('identity_area')}>{field?.areaHa != null ? `${field.areaHa} ${t('unit_hectare')}` : t('not_set')}</MetadataListItem>
        </MetadataList>
        {!isMobile ? (
          <Button label={t('plan_ask_ai')} variant="secondary" icon={<MessageCircle size={16} />} onClick={() => setIsChatOpen((v) => !v)} />
        ) : null}
      </HStack>

      {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}
      {cycleJustCompleted ? <Banner status="success" title={t('plan_cycle_complete')} /> : null}

      {!planLoaded ? (
        <Skeleton height={240} />
      ) : timeline.length === 0 ? (
        <Banner status="info" title={t('plan_empty_title')} description={t('plan_empty_desc')} />
      ) : (
        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <Card padding={3}>
              <VStack gap={0}>
                {timeline.map((ev, i) => (
                  <VStack key={ev.id} gap={2}>
                    {i > 0 ? <Divider /> : null}
                    <HStack gap={3} vAlign="start" justify="between" wrap="wrap">
                      <StackItem size="fill">
                        <VStack gap={1.5}>
                          <HStack gap={2} vAlign="center">
                            <StatusDot variant={STATUS_DOT_VARIANT[ev.status]} label={t(`plan_status_${ev.status}`)} />
                            <Badge variant={ev.status === 'shifted' ? 'yellow' : 'neutral'} label={ev.plannedDate ?? t('not_set')} />
                          </HStack>
                          <Text type="label" weight="semibold">
                            {ev.title}
                          </Text>
                          <Text type="supporting" color="secondary">
                            {ev.quantity != null ? `${ev.quantity}${ev.unit ?? ''}` : ev.action ?? t(`plan_status_${ev.status}`)}
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
                      </StackItem>
                      {ev.status === 'pending' || ev.status === 'shifted' ? (
                        <Button label={t('plan_mark_done')} variant="secondary" size="sm" onClick={() => onMarkDone(ev.id)} />
                      ) : null}
                    </HStack>
                  </VStack>
                ))}
              </VStack>
            </Card>
          </StackItem>

          {!isMobile && isChatOpen ? (
            <StackItem>
              <Card width={380} height={480}>
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
        </HStack>
      )}

      {isMobile ? <MobileChatOverlay feed={feed} sendMessage={sendMessage} isStreaming={isStreaming} /> : null}
    </VStack>
  );
}
