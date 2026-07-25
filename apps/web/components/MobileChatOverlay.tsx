// Mobile chat — a persistent bottom bar over whatever page is showing, that opens into a
// full-screen overlay when tapped (Claude-mobile pattern), per stakeholder feedback: "The
// chat is going to work on phone like as claude works on phones as an overlay over other
// apps." Only rendered on mobile viewports (useAppShellMobile) — desktop keeps the
// side-by-side chat panel on the page itself.
'use client';

import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout } from '@astryxdesign/core/Layout';
import { ChatLayout, ChatMessageList, ChatComposer, ChatSendButton } from '@astryxdesign/core/Chat';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { MessageCircle } from 'lucide-react';
import { useT } from '../app/providers';
import { FeedTrace, FeedMessage, ThinkingIndicator } from './mock/FeedChat';
import type { FeedItem } from '../lib/feed';
import type { ChatActivity } from '../lib/useFieldChat';

export function MobileChatOverlay({
  feed,
  sendMessage,
  isStreaming,
  activity = null,
}: {
  feed: FeedItem[];
  sendMessage: (message: string) => void;
  isStreaming: boolean;
  activity?: ChatActivity;
}) {
  const { t } = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [composerValue, setComposerValue] = useState('');

  function handleSubmit(value: string) {
    if (!value.trim()) return;
    sendMessage(value);
    setComposerValue('');
  }

  return (
    <>
      {/* Functional-only fixed positioning — no color/radius/spacing values here, those all
          come from Button/tokens. Same justified pattern as the plan timeline's scroll container. */}
      <div style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 40 }}>
        <Button label={t('composer_placeholder')} variant="secondary" width="100%" icon={<MessageCircle size={16} />} onClick={() => setIsOpen(true)} />
      </div>

      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} variant="fullscreen">
        <Layout
          header={<DialogHeader title={t('field_chat_nav')} onOpenChange={setIsOpen} />}
          content={
            <ChatLayout
              composer={
                <ChatComposer
                  value={composerValue}
                  onChange={setComposerValue}
                  placeholder={t('composer_placeholder')}
                  onSubmit={handleSubmit}
                  sendButton={<ChatSendButton />}
                  isDisabled={isStreaming}
                />
              }
              emptyState={<EmptyState title={t('thread_empty_title')} description={t('thread_empty_description')} />}
            >
              <ChatMessageList>
                {feed.map((item) => (item.type === 'tool_trace' ? <FeedTrace key={item.id} traces={item.traces} /> : <FeedMessage key={item.id} item={item} />))}
                {activity === 'thinking' ? <ThinkingIndicator /> : null}
              </ChatMessageList>
            </ChatLayout>
          }
        />
      </Dialog>
    </>
  );
}
