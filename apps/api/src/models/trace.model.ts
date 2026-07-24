// M — traces. The registry wrapper (§C.7) opens a row in 'running', then closes it
// ok|error|fallback with the raw result + duration. This IS Tier-0 #8's evidence store.
import { query } from '../config/db';
import type { ToolClass, TraceEntry, TraceStatus } from '@agrisense/shared';

export interface TraceHandle {
  id: string;
  step: number;
  startedAt: number;
}

interface TraceRow {
  id: string;
  conversation_id: string;
  message_id: string | null;
  step: number;
  tool: string;
  tool_class: ToolClass;
  params: unknown;
  result: unknown;
  source: string | null;
  status: TraceStatus;
  duration_ms: number | null;
  created_at: string;
}

function toTraceEntry(r: TraceRow): TraceEntry {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    messageId: r.message_id,
    step: r.step,
    tool: r.tool,
    toolClass: r.tool_class,
    params: r.params,
    result: r.result,
    source: r.source,
    status: r.status,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  };
}

export const TraceModel = {
  async begin(
    conversationId: string,
    messageId: string | null,
    step: number,
    tool: string,
    toolClass: ToolClass,
    params: unknown,
  ): Promise<TraceHandle> {
    const [row] = await query<{ id: string }>(
      `insert into traces (conversation_id, message_id, step, tool, tool_class, params, status)
       values ($1,$2,$3,$4,$5,$6,'running') returning id`,
      [conversationId, messageId, step, tool, toolClass, JSON.stringify(params)],
    );
    return { id: row!.id, step, startedAt: Date.now() };
  },

  async ok(h: TraceHandle, result: unknown, source: string | null, durationMs: number): Promise<void> {
    await this.finish(h, 'ok', result, source, durationMs);
  },

  async error(h: TraceHandle, err: unknown, durationMs: number): Promise<void> {
    await this.finish(h, 'error', { error: String(err) }, null, durationMs);
  },

  async fallback(h: TraceHandle, result: unknown, err: unknown, durationMs: number): Promise<void> {
    await this.finish(h, 'fallback', { result, error: String(err) }, null, durationMs);
  },

  async finish(
    h: TraceHandle,
    status: TraceStatus,
    result: unknown,
    source: string | null,
    durationMs: number,
  ): Promise<void> {
    await query('update traces set status=$1, result=$2, source=$3, duration_ms=$4 where id=$5', [
      status,
      JSON.stringify(result),
      source,
      durationMs,
      h.id,
    ]);
  },

  async listByConversation(conversationId: string): Promise<TraceEntry[]> {
    const rows = await query<TraceRow>('select * from traces where conversation_id = $1 order by step', [conversationId]);
    return rows.map(toTraceEntry);
  },
};
