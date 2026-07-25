// Dedicated full-page chat — the conversational intake surface (§1.2 #1). A live SSE chat
// (lib/useFieldChat) on the left, and the "field record filling in live" IntakePanel on the
// right so the six intake fields visibly populate as the agent gathers them — the flow reads
// as an orchestrated decision process, not a plain chatbot. The panel re-fetches after every
// agent turn (the agent writes the field via update_field mid-turn).
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell, useAppShellMobile } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { IntakePanel } from '../../../../components/IntakePanel';
import { FeedTrace, FeedMessage, FeedThinking } from '../../../../components/mock/FeedChat';
import { useFieldChat } from '../../../../lib/useFieldChat';
import { getField, listFields, listRecentChats, type ApiField, type ApiRecentChat } from '../../../../lib/api';

export default function FieldChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('c') ?? undefined;
  const { t } = useT();
  const { session, isHydrated } = useSession();
  const { isMobile } = useAppShellMobile();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [recentChats, setRecentChats] = useState<ApiRecentChat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');

  const { feed, sendMessage, isStreaming, isLoaded } = useFieldChat(id, conversationId);

  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (isLoaded && feed.length === 0 && !isStreaming && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      sendMessage("Hi, I just created this field. Please help me set it up.");
    }
  }, [isLoaded, feed.length, isStreaming, sendMessage]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    getField(id).then(setField).catch((err) => setError(String(err)));
    if (session.farmId) {
      listFields(session.farmId)
        .then((res) => setSiblingFields(res.fields))
        .catch(() => {});
      listRecentChats(session.farmId)
        .then((res) => setRecentChats(res.chats))
        .catch(() => {});
    }
  }, [id, isHydrated, session, router]);

  // The agent gathers field data mid-turn via update_field — re-fetch the field (and the
  // sidebar's recent chats) the moment a streamed turn finishes, so the IntakePanel fills in.
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      getField(id).then(setField).catch(() => {});
      if (session?.farmId) listRecentChats(session.farmId).then((res) => setRecentChats(res.chats)).catch(() => {});
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, id, session]);

  function handleComposerSubmit(value: string) {
    if (!value.trim()) return;
    sendMessage(value);
    setComposerValue('');
  }

  if (!isHydrated || !session) return null;

  const lastItem = feed[feed.length - 1];
  const isThinking = isStreaming && (!lastItem || lastItem.type === 'tool_trace' || (lastItem.type === 'message' && lastItem.message.role === 'user'));

  const chatColumn = (
    <VStack height="100%" gap={0}>
      <StackItem>
        <VStack gap={2} padding={3}>
          <Text type="display-3">{field?.name ?? t('field_unnamed')}</Text>
          {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}
        </VStack>
      </StackItem>

      <StackItem size="fill">
        <ChatLayout
          composer={
            <ChatComposer
              value={composerValue}
              onChange={setComposerValue}
              placeholder={t('composer_placeholder')}
              onSubmit={handleComposerSubmit}
              sendButton={<ChatSendButton />}
              isDisabled={isStreaming}
            />
          }
          emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
        >
          <ChatMessageList>
            {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
            {isThinking && <FeedThinking />}
          </ChatMessageList>
        </ChatLayout>
      </StackItem>
    </VStack>
  );

  return (
    <AppShell
      height="fill"
      contentPadding={0}
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
      {isMobile || !field ? (
        chatColumn
      ) : (
        <HStack height="100%" gap={0} vAlign="stretch">
          <StackItem size="fill">{chatColumn}</StackItem>
          <StackItem>
            {/* functional-only inline style: fixed rail width + own vertical scroll */}
            <div style={{ width: 360, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', position: 'sticky', top: 24 }}>
              <VStack padding={3}>
                <IntakePanel field={field} farmDistrict={session.farmDistrict} fieldId={id} />
              </VStack>
            </div>
          </StackItem>
        </HStack>
      )}
    </AppShell>
  );
}
