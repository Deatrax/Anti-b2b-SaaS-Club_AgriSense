// V — trace serializer: trace rows → the inline tool-call blocks + [Trace] tab (§C.7).
import type { TraceEntry, ToolClass } from '@agrisense/shared';

const TOOL_CLASS_COLOR: Record<ToolClass, string> = {
  field: 'green',
  external: 'blue',
  retrieval: 'purple',
  deterministic: 'teal',
  gated: 'orange',
};

function serializeTraceEntry(t: TraceEntry) {
  return {
    id: t.id,
    step: t.step,
    tool: t.tool,
    toolClass: t.toolClass,
    colorHint: TOOL_CLASS_COLOR[t.toolClass],
    params: t.params,
    result: t.result,
    source: t.source,
    status: t.status,
    durationMs: t.durationMs,
    createdAt: t.createdAt,
  };
}

/** Groups trace rows by the assistant message they belong to — a chat turn's tool calls
 * render together, in step order, each carrying a class-based colour hint. */
export function serializeTraces(traces: TraceEntry[]) {
  const byMessage = new Map<string, ReturnType<typeof serializeTraceEntry>[]>();
  for (const t of [...traces].sort((a, b) => a.step - b.step)) {
    const key = t.messageId ?? `step-${t.step}`;
    const list = byMessage.get(key) ?? [];
    list.push(serializeTraceEntry(t));
    byMessage.set(key, list);
  }
  return Array.from(byMessage.entries()).map(([messageId, calls]) => ({ messageId, calls }));
}
