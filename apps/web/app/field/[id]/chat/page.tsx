// Dedicated full-page chat, separate from Overview's embedded half-chat panel — per
// stakeholder feedback: "A dedicated chat page." Same live SSE (lib/useFieldChat) as every
// other chat surface, just given the whole stage instead of half of it.
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { FeedTrace, FeedMessage } from '../../../../components/mock/FeedChat';
import { useFieldChat } from '../../../../lib/useFieldChat';
import { getField, listFields, type ApiField } from '../../../../lib/api';

export default function FieldChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const { session } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');

  const { feed, sendMessage, isStreaming } = useFieldChat(id);

  useEffect(() => {
    if (!session) {
      router.push('/');
      return;
    }
    getField(id).then(setField).catch((err) => setError(String(err)));
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

  if (!session) return null;

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      sideNav={<FieldRail farmName={session.farmName ?? ''} fields={siblingFields} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
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
            </ChatMessageList>
          </ChatLayout>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
