// Shared chat-feed rendering for the /mock screens that show lib/mock-data.ts's FeedItem
// stream (Overview, Trace, Replan) — the exact FeedTrace/FeedMessage pattern already
// built inline in app/field/[id]/page.tsx, lifted here so three new routes don't each
// re-derive it.
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { ChatMessage, ChatMessageBubble, ChatMessageMetadata, ChatToolCalls } from '@astryxdesign/core/Chat';
import type { TraceEntry } from '@agrisense/shared';
import { useT } from '../../app/providers';
import type { FeedItem } from '../../lib/mock-data';

export function toolCallStatus(status: TraceEntry['status']): 'pending' | 'running' | 'complete' | 'error' {
  if (status === 'ok' || status === 'fallback') return 'complete';
  if (status === 'error') return 'error';
  return status;
}

export function formatTarget(params: unknown): string {
  if (params == null || typeof params !== 'object') return '';
  return Object.entries(params as Record<string, unknown>)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(', ');
}

function TraceResultDetail({ trace }: { trace: TraceEntry }) {
  const { t } = useT();
  const rows = trace.result && typeof trace.result === 'object' ? Object.entries(trace.result as Record<string, unknown>) : [];
  return (
    <VStack gap={0.5}>
      {rows.map(([k, v]) => (
        <Text key={k} type="supporting" color="secondary">
          {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </Text>
      ))}
      {trace.source ? (
        <Text type="supporting" color="secondary">
          {t('why_sources')}: {trace.source}
        </Text>
      ) : null}
    </VStack>
  );
}

export function FeedTrace({ traces, isExpanded }: { traces: TraceEntry[]; isExpanded?: boolean }) {
  return (
    <ChatToolCalls
      isExpanded={isExpanded}
      calls={traces.map((tr) => ({
        key: tr.id,
        name: tr.tool,
        node: tr.toolClass,
        status: toolCallStatus(tr.status),
        target: formatTarget(tr.params),
        duration: tr.durationMs != null ? `${tr.durationMs}ms` : undefined,
        resultDetail: <TraceResultDetail trace={tr} />,
      }))}
    />
  );
}

export function FeedMessage({ item }: { item: Extract<FeedItem, { type: 'message' }> }) {
  const { t } = useT();
  const { message } = item;
  return (
    <ChatMessage sender={message.role === 'user' ? 'user' : 'assistant'}>
      <ChatMessageBubble
        variant={message.role === 'user' ? 'filled' : 'ghost'}
        metadata={
          <ChatMessageMetadata
            timestamp={<Timestamp value={message.createdAt} format="relative" />}
            footer={message.isProactive ? t('proactive_marker') : undefined}
          />
        }
      >
        {message.content}
      </ChatMessageBubble>
    </ChatMessage>
  );
}
