// agent/orchestrator.ts — the hand-rolled tool loop (§C.2). No framework: Vercel AI SDK
// tool primitives + a bounded loop with a hard step cap and a GRACEFUL exit (not a throw).
import type { Phase } from '@agrisense/shared';

export interface AgentContext {
  fieldId: string;
  conversationId: string;
  // model, stream, tool registry — wired by chat.controller.
  [k: string]: unknown;
}

const MAX_STEPS = 10;

export async function runAgent(_ctx: AgentContext, _userMessage: string): Promise<void> {
  // TODO (§C.2):
  //   1. field = FieldModel.getState(ctx.fieldId); phase = derivePhase(field)   // code, not LLM
  //   2. messages = [ system(buildSystemPrompt(field, phase)), ...recent(20), user ]
  //   3. for step = 1..MAX_STEPS:
  //        result = generateText({ model, messages, tools: toolsForPhase(phase),
  //                   toolChoice: step === 1 && phase === 'PLANNING' ? 'required' : 'auto' })
  //        stream.text(result.text); messages.push(...result.response.messages)
  //        if (!result.toolCalls?.length) return                     // agent is done talking
  //        for (const call of result.toolCalls):
  //            out = registry.invoke(call, ctx)                       // traced inside (§C.7)
  //            stream.toolResult(call, out); messages.push(toolResult)
  //   4. stream.notice('Reached the step limit — here is what I have so far.')  // graceful
  void MAX_STEPS;
  throw new Error('runAgent not implemented (§C.2)');
}

export type { Phase };
