// lib/feed.ts — the unified chat + tool-trace feed shape, shared by every chat surface
// (Overview's embedded panel, the dedicated chat page, Plan's side panel). Moved out of
// lib/mock-data.ts so live SSE-driven pages and any remaining mock pages can both use it.
import type { Message, TraceEntry } from '@agrisense/shared';

export type FeedItem = { id: string; type: 'message'; message: Message } | { id: string; type: 'tool_trace'; traces: TraceEntry[] };

/** Reconstructs a feed from persisted history (GET /fields/:id/chat) in the same shape
 * useFieldChat builds live from SSE events — messages and traces interleaved
 * chronologically, with ADJACENT traces merged into one collapsed block, matching how
 * the live stream groups a turn's tool calls. */
export function buildFeedFromHistory(messages: Message[], traces: TraceEntry[]): FeedItem[] {
  const items: Array<FeedItem & { createdAt: string }> = [
    ...messages.map((m) => ({ id: m.id, type: 'message' as const, message: m, createdAt: m.createdAt })),
    ...traces.map((tr) => ({ id: `trace-${tr.id}`, type: 'tool_trace' as const, traces: [tr], createdAt: tr.createdAt })),
  ];
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const merged: FeedItem[] = [];
  for (const { createdAt: _createdAt, ...item } of items) {
    const last = merged[merged.length - 1];
    if (item.type === 'tool_trace' && last && last.type === 'tool_trace') {
      last.traces = [...last.traces, ...item.traces];
    } else {
      merged.push(item);
    }
  }
  return merged;
}
