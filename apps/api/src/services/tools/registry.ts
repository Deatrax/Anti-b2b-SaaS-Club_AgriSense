// tools/registry.ts — name → {schema, handler, meta}. The TRACE WRAPPER (§C.7) lives HERE,
// written before the second tool exists: every invoke() opens/closes a trace row + streams it.
// A visible `fallback` state ("⚠ Open-Meteo timed out → cached forecast") is a FEATURE.
import type { z } from 'zod';
import type { Phase, ToolClass, ToolResult } from '@agrisense/shared';

export interface ToolDef<A = unknown, R = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<A>;
  toolClass: ToolClass;
  phases: Phase[];
  handler: (args: A, ctx: unknown) => Promise<ToolResult<R>>;
  fallback?: (args: A) => ToolResult<R>;
  timeoutMs?: number;
}

const registry = new Map<string, ToolDef>();

export function register<A, R>(def: ToolDef<A, R>): void {
  // TODO (§C.7): store `def` but WRAP handler with:
  //   TraceModel.begin → stream.toolStart → withTimeout(handler, def.timeoutMs ?? 8000)
  //     → TraceModel.ok + stream.toolEnd('ok')
  //   catch → if def.fallback: TraceModel.fallback + stream.toolEnd('fallback')
  //           else: TraceModel.error + stream.toolEnd('error') + rethrow
  registry.set(def.name, def as ToolDef);
  throw new Error('register wrapper not implemented (§C.7)');
}

export function getRegistry(): Map<string, ToolDef> {
  return registry;
}
