// Trace entries, chat messages, and the SSE event union streamed to the web trace panel.
import type { ToolClass } from './tool';

export type TraceStatus = 'running' | 'ok' | 'error' | 'fallback';

/** One row per tool call (§1.2 #8): params sent + raw values returned + timing. */
export interface TraceEntry {
  id: string;
  conversationId: string;
  messageId: string | null;
  step: number;
  tool: string;
  toolClass: ToolClass;
  params: unknown;
  result: unknown;
  source: string | null;
  status: TraceStatus;
  durationMs: number | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls: unknown;
  /** true when the agent spoke unprompted after a replan (§B.4 edit-and-replan). */
  isProactive: boolean;
  createdAt: string;
}

/** SSE events streamed from services/agent/stream.ts to the web client (§C.7). */
export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; trace: TraceEntry }
  | { type: 'tool_end'; trace: TraceEntry }
  | { type: 'notice'; message: string }
  | { type: 'done' };
