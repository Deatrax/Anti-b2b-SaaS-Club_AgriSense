// lib/feed.ts — the unified chat + tool-trace feed shape, shared by every chat surface
// (Overview's embedded panel, the dedicated chat page, Plan's side panel). Moved out of
// lib/mock-data.ts so live SSE-driven pages and any remaining mock pages can both use it.
import type { Message, TraceEntry } from '@agrisense/shared';

export type FeedItem = { id: string; type: 'message'; message: Message } | { id: string; type: 'tool_trace'; traces: TraceEntry[] };
