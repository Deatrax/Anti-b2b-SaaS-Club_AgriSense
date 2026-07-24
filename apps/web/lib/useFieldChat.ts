// lib/useFieldChat.ts — drives a field's live chat via SSE (POST /api/chat), producing the
// same FeedItem[] shape components/mock/FeedChat.tsx already renders. One hook, reused by
// the Overview embedded panel, the dedicated chat page, and Plan's side panel — so a message
// sent from any of them behaves identically.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StreamEvent } from '@agrisense/shared';
import { openChatStream } from './sse';
import { getFieldChatHistory, getConversation } from './api';
import { buildFeedFromHistory, type FeedItem } from './feed';

const CONV_ID = 'live'; // display-only placeholder; the real conversation id lives server-side

function userMessage(content: string): FeedItem {
  return {
    id: `user-${Date.now()}`,
    type: 'message',
    message: { id: `um-${Date.now()}`, conversationId: CONV_ID, role: 'user', content, toolCalls: null, isProactive: false, createdAt: new Date().toISOString() },
  };
}

/** @param conversationId - a specific thread to open (a "recent chats" entry). Omit to use
 * the field's default (most recently started) conversation, creating one on first send —
 * what Overview/Plan's embedded panels and a plain Chat-tab visit want. */
export function useFieldChat(fieldId: string, conversationId?: string) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFeed([]);
    assistantIdRef.current = null;
    const load = conversationId ? getConversation(conversationId) : getFieldChatHistory(fieldId);
    load
      .then((history) => {
        if (!cancelled) setFeed(buildFeedFromHistory(history.messages, history.traces));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fieldId, conversationId]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim() || isStreaming) return;
      setFeed((f) => [...f, userMessage(message)]);
      setIsStreaming(true);
      assistantIdRef.current = null;

      const close = openChatStream({ fieldId, message, conversationId }, (event: StreamEvent) => {
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
          // Consecutive tool calls collapse into ONE feed block (Claude-style "worked for…"
          // summary) instead of one block per call; a text message in between starts a new
          // block. tool_end replaces its tool_start entry in place by trace id.
          setFeed((f) => {
            const last = f[f.length - 1];
            if (last && last.type === 'tool_trace') {
              const idx = last.traces.findIndex((tr) => tr.id === event.trace.id);
              const traces = idx >= 0 ? last.traces.map((tr, i) => (i === idx ? event.trace : tr)) : [...last.traces, event.trace];
              return [...f.slice(0, -1), { ...last, traces }];
            }
            return [...f, { id: `trace-${event.trace.id}`, type: 'tool_trace', traces: [event.trace] }];
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
    [fieldId, conversationId, isStreaming],
  );

  return { feed, sendMessage, isStreaming };
}
