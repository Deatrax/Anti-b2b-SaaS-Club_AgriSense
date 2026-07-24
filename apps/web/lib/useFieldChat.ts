// lib/useFieldChat.ts — drives a field's live chat via SSE (POST /api/chat), producing the
// same FeedItem[] shape components/mock/FeedChat.tsx already renders. One hook, reused by
// the Overview embedded panel, the dedicated chat page, and Plan's side panel — so a message
// sent from any of them behaves identically.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StreamEvent } from '@agrisense/shared';
import { openChatStream } from './sse';
import { getFieldChatHistory } from './api';
import { buildFeedFromHistory, type FeedItem } from './feed';

const CONV_ID = 'live'; // display-only placeholder; the real conversation id lives server-side

function userMessage(content: string): FeedItem {
  return {
    id: `user-${Date.now()}`,
    type: 'message',
    message: { id: `um-${Date.now()}`, conversationId: CONV_ID, role: 'user', content, toolCalls: null, isProactive: false, createdAt: new Date().toISOString() },
  };
}

export function useFieldChat(fieldId: string) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFeed([]);
    assistantIdRef.current = null;
    getFieldChatHistory(fieldId)
      .then((history) => {
        if (!cancelled) setFeed(buildFeedFromHistory(history.messages, history.traces));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim() || isStreaming) return;
      setFeed((f) => [...f, userMessage(message)]);
      setIsStreaming(true);
      assistantIdRef.current = null;

      const close = openChatStream({ fieldId, message }, (event: StreamEvent) => {
        if (event.type === 'text') {
          setFeed((f) => {
            if (assistantIdRef.current) {
              return f.map((item) =>
                item.id === assistantIdRef.current && item.type === 'message'
                  ? { ...item, message: { ...item.message, content: item.message.content + event.delta } }
                  : item,
              );
            }
            const id = `assistant-${Date.now()}`;
            assistantIdRef.current = id;
            return [
              ...f,
              {
                id,
                type: 'message',
                message: { id, conversationId: CONV_ID, role: 'assistant', content: event.delta, toolCalls: null, isProactive: false, createdAt: new Date().toISOString() },
              },
            ];
          });
        } else if (event.type === 'tool_start' || event.type === 'tool_end') {
          setFeed((f) => {
            const key = `trace-${event.trace.id}`;
            const idx = f.findIndex((item) => item.id === key);
            const entry: FeedItem = { id: key, type: 'tool_trace', traces: [event.trace] };
            if (idx >= 0) {
              const copy = [...f];
              copy[idx] = entry;
              return copy;
            }
            return [...f, entry];
          });
        } else if (event.type === 'notice') {
          setFeed((f) => [
            ...f,
            {
              id: `notice-${Date.now()}`,
              type: 'message',
              message: { id: `nm-${Date.now()}`, conversationId: CONV_ID, role: 'assistant', content: event.message, toolCalls: null, isProactive: true, createdAt: new Date().toISOString() },
            },
          ]);
        } else if (event.type === 'done') {
          setIsStreaming(false);
        }
      });
      closeRef.current = close;
    },
    [fieldId, isStreaming],
  );

  return { feed, sendMessage, isStreaming };
}
