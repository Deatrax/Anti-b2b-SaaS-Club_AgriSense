// V — trace serializer: trace rows → the inline tool-call blocks + [Trace] tab (§C.7).
import type { TraceEntry } from '@agrisense/shared';

export function serializeTraces(traces: TraceEntry[]) {
  // TODO: group by message/step; colour hint by tool_class; keep raw params + result.
  return traces;
}
