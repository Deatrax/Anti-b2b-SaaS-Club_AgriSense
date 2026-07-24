// tools/registry.ts — name → {schema, handler, meta}. The TRACE WRAPPER (§C.7) lives HERE,
// written before the second tool exists: every invoke() opens/closes a trace row + streams it.
// A visible `fallback` state ("⚠ Open-Meteo timed out → cached forecast") is a FEATURE.
import type { z } from 'zod';
import type { Phase, ToolClass, ToolResult, TraceEntry } from '@agrisense/shared';
import type { AgentStream } from '../agent/stream';
import { TraceModel } from '../../models/trace.model';

/**
 * What every tool handler receives, threaded down from the orchestrator (§C.2).
 * Only the three fields the trace wrapper itself needs are typed; everything else
 * (fieldId, model, …) rides along via the index signature.
 */
export interface ToolCtx {
  conversationId: string;
  messageId: string | null;
  stream: AgentStream;
  [key: string]: unknown;
}

export interface ToolDef<A = unknown, R = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<A>;
  toolClass: ToolClass;
  phases: Phase[];
  handler: (args: A, ctx: ToolCtx) => Promise<ToolResult<R>>;
  fallback?: (args: A) => ToolResult<R>;
  timeoutMs?: number;
}

const registry = new Map<string, ToolDef>();

/** Trace rows are ordered by (conversation_id, step) — one counter per conversation. */
const stepCounters = new Map<string, number>();

function nextStep(conversationId: string): number {
  const step = (stepCounters.get(conversationId) ?? 0) + 1;
  stepCounters.set(conversationId, step);
  return step;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`tool timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function register<A, R>(def: ToolDef<A, R>): void {
  const traced = async (args: A, ctx: ToolCtx): Promise<ToolResult<R>> => {
    const step = nextStep(ctx.conversationId);
    const handle = await TraceModel.begin(
      ctx.conversationId,
      ctx.messageId,
      step,
      def.name,
      def.toolClass,
      args,
    );
    const running: TraceEntry = {
      id: handle.id,
      conversationId: ctx.conversationId,
      messageId: ctx.messageId,
      step,
      tool: def.name,
      toolClass: def.toolClass,
      params: args,
      result: null,
      source: null,
      status: 'running',
      durationMs: null,
      createdAt: new Date().toISOString(),
    };
    ctx.stream.toolStart(running); // UI: "running" — never a bare spinner
    const started = Date.now();

    try {
      const out = await withTimeout(def.handler(args, ctx), def.timeoutMs ?? 8000);
      const durationMs = Date.now() - started;
      const source = out.provenance[0]?.source ?? null;
      await TraceModel.ok(handle, out, source, durationMs);
      const finished: TraceEntry = { ...running, result: out, source, status: 'ok', durationMs };
      ctx.stream.toolEnd(finished, out, 'ok');
      return out;
    } catch (err) {
      const durationMs = Date.now() - started;
      if (!def.fallback) {
        await TraceModel.error(handle, err, durationMs);
        const errorResult = { error: String(err) };
        const finished: TraceEntry = { ...running, result: errorResult, status: 'error', durationMs };
        ctx.stream.toolEnd(finished, errorResult, 'error');
        throw err;
      }
      const fb = def.fallback(args);
      await TraceModel.fallback(handle, fb, err, durationMs);
      const source = fb.provenance[0]?.source ?? null;
      const finished: TraceEntry = { ...running, result: fb, source, status: 'fallback', durationMs };
      ctx.stream.toolEnd(finished, fb, 'fallback'); // UI: ⚠ visible — a feature, not a bug
      return fb;
    }
  };

  registry.set(def.name, { ...def, handler: traced } as ToolDef);
}

export function getRegistry(): Map<string, ToolDef> {
  return registry;
}
