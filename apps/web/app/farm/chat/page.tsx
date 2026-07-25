'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Card } from '@astryxdesign/core/Card';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useT, useSession } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { FieldRail } from '../../../components/FieldRail';
import { FeedTrace, FeedMessage, FeedThinking } from '../../../components/mock/FeedChat';
import { useFieldChat } from '../../../lib/useFieldChat';
import { listFields, listRecentChats, updateConversation, type ApiField, type ApiRecentChat } from '../../../lib/api';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('c') ?? undefined;
  const { t } = useT();
  const { session, isHydrated } = useSession();

  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [recentChats, setRecentChats] = useState<ApiRecentChat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');

  const { feed, sendMessage, isStreaming, isLoaded } = useFieldChat(session?.farmId ?? '', undefined, conversationId);

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    if (session.farmId) {
      listFields(session.farmId)
        .then((res) => setSiblingFields(res.fields))
        .catch(() => {});
      listRecentChats(session.farmId)
        .then((res) => setRecentChats(res.chats))
        .catch(() => {});
    }
  }, [isHydrated, session, router]);

  const wasStreaming = useRef(false);
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      if (session?.farmId) {
        listRecentChats(session.farmId).then((res) => setRecentChats(res.chats)).catch(() => {});
      }
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, session]);

  function handleComposerSubmit(value: string) {
    if (!value.trim()) return;
    sendMessage(value);
    setComposerValue('');
  }

  function handleAttach() {
    if (!conversationId || !selectedFieldId) return;
    updateConversation(conversationId, selectedFieldId)
      .then(() => {
        router.push(`/field/${selectedFieldId}/chat?c=${conversationId}`);
      })
      .catch((err) => setError(String(err)));
  }

  if (!isHydrated || !session) return null;

  const lastItem = feed[feed.length - 1];
  const isThinking = isStreaming && (!lastItem || lastItem.type === 'tool_trace' || (lastItem.type === 'message' && lastItem.message.role === 'user'));

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
          recentChats={recentChats}
        />
      }
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack height="100%" gap={0}>
        <StackItem>
          <VStack gap={2} padding={3}>
            <Text type="display-3">General Chat</Text>
            {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}
          </VStack>
        </StackItem>

        <StackItem size="fill">
          <ChatLayout
            composer={
              <VStack gap={3}>
                <ChatComposer
                  value={composerValue}
                  onChange={setComposerValue}
                  placeholder={t('composer_placeholder')}
                  onSubmit={handleComposerSubmit}
                  sendButton={<ChatSendButton />}
                  isDisabled={isStreaming}
                />
                {conversationId && siblingFields.length > 0 ? (
                  <Card variant="muted" padding={2}>
                    <HStack vAlign="center" gap={2}>
                      <Text type="supporting">Attach to Project:</Text>
                      <Selector
                        label="Project"
                        isLabelHidden
                        size="sm"
                        value={selectedFieldId}
                        onChange={setSelectedFieldId}
                        options={siblingFields.map(f => ({ label: f.name ?? 'Unnamed field', value: f.id }))}
                      />
                      <Button label="Attach" size="sm" onClick={handleAttach} isDisabled={!selectedFieldId} />
                    </HStack>
                  </Card>
                ) : null}
              </VStack>
            }
            emptyState={<EmptyState title={t('thread_empty_title')} description="This is a general advisory chat. Attach it to a project to create a season plan." />}
          >
            <ChatMessageList>
              {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
              {isThinking && <FeedThinking />}
            </ChatMessageList>
          </ChatLayout>
        </StackItem>
      </VStack>
    </AppShell>
  );
}

export default function FarmChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}
