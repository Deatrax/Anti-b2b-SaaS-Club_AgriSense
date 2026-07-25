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
  const [isLoaded, setIsLoaded] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFeed([]);
    setIsLoaded(false);
    assistantIdRef.current = null;
    const load = conversationId ? getConversation(conversationId) : getFieldChatHistory(fieldId);
    load
      .then((history) => {
        if (!cancelled) {
          setFeed(buildFeedFromHistory(history.messages, history.traces));
          setIsLoaded(true);
        }
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
          // Determine the ID outside the state updater if we need a new one
          const activeId = assistantIdRef.current || `assistant-${Date.now()}`;
          
          // Only update the ref if it changed, outside the setFeed call
          if (assistantIdRef.current !== activeId) {
            assistantIdRef.current = activeId;
          }

          setFeed((f) => {
            const exists = f.some((item) => item.id === activeId);

            if (exists) {
              return f.map((item) =>
                item.id === activeId && item.type === 'message'
                  ? { ...item, message: { ...item.message, content: item.message.content + event.delta } }
                  : item,
              );
            }
            return [
              ...f,
              {
                id: activeId,
                type: 'message',
                message: { id: activeId, conversationId: CONV_ID, role: 'assistant', content: event.delta, toolCalls: null, isProactive: false, createdAt: new Date().toISOString() },
              },
            ];
          });
        } else if (event.type === 'tool_start' || event.type === 'tool_end') {
          // CLOSE the open assistant bubble (BUG: "tool call happens but the output never
          // shows"). assistantIdRef used to survive the whole turn, so the text of step 2+
          // was appended into the bubble created in step 1 — which now sits ABOVE this trace
          // block. The answer WAS arriving; it was being written off-screen above the last
          // tool card while autoscroll sat at the bottom. Clearing the ref makes the next
          // text delta open a fresh bubble BELOW the trace, which is where a reader looks.
          if (event.type === 'tool_start') assistantIdRef.current = null;
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
          // Same reason as tool_start: a notice is its own feed row, so any text that
          // follows it must start a new bubble rather than reopening the one above it.
          assistantIdRef.current = null;
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

  return { feed, sendMessage, isStreaming, isLoaded };
}
