// agent/orchestrator.ts — the hand-rolled tool loop (§C.2). No framework: Vercel AI SDK
// tool primitives + a bounded loop with a hard step cap and a GRACEFUL exit (not a throw).
import { generateText, tool, type CoreMessage, type LanguageModel, type ToolSet } from 'ai';
import type { Phase } from '@agrisense/shared';
import { getRegistry, type ToolCtx } from '../tools/registry';
import { FieldModel } from '../../models/field.model';
import { ConversationModel } from '../../models/conversation.model';
import { derivePhase } from './phase';
import { buildSystemPrompt, toolsForPhase } from './prompt';

/**
 * Threaded through a whole chat turn. IS-A ToolCtx (§C.7) — every field it requires
 * (conversationId, messageId, fieldId, stream) is exactly what tool handlers need too,
 * so this can be passed straight into a registered tool's handler with no adapting.
 * model/stream — wired by chat.controller.
 */
export interface AgentContext extends ToolCtx {
  model: LanguageModel;
}

const MAX_STEPS = 10;

export async function runAgent(ctx: AgentContext, userMessage: string): Promise<void> {
  const field = await FieldModel.getState(ctx.fieldId);
  const phase = derivePhase(field); // TRANSACTING wiring lands in Phase 7 — no proposals exist yet

  await ConversationModel.addMessage(ctx.conversationId, 'user', userMessage);
  const history = await ConversationModel.recentMessages(ctx.conversationId, 20);
  const messages: CoreMessage[] = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }) as CoreMessage),
    { role: 'user', content: userMessage },
  ];

  const system = buildSystemPrompt(field, phase);
  const tools = buildToolSet(toolsForPhase(phase));
  const textParts: string[] = [];
  const toolCallLog: Array<{ name: string; args: unknown }> = [];

  for (let step = 1; step <= MAX_STEPS; step++) {
    let result: Awaited<ReturnType<typeof generateText>>;
    try {
      result = await generateText({
        model: ctx.model,
        system,
        messages,
        tools,
        toolChoice: step === 1 && phase === 'PLANNING' ? 'required' : 'auto',
      });
    } catch (err) {
      ctx.stream.notice(`⚠ The reasoning model is unavailable right now (${String(err)}) — please try again.`);
      await persist(ctx, textParts, toolCallLog);
      ctx.stream.done();
      return;
    }

    if (result.text) {
      ctx.stream.text(result.text);
      textParts.push(result.text);
    }
    messages.push(...result.response.messages);

    if (!result.toolCalls.length) {
      await persist(ctx, textParts, toolCallLog);
      ctx.stream.done();
      return;
    }

    for (const call of result.toolCalls) {
      toolCallLog.push({ name: call.toolName, args: call.args });
      const def = getRegistry().get(call.toolName);
      let toolResult: unknown;
      let isError = false;
      if (!def) {
        toolResult = { error: `unknown tool "${call.toolName}"` };
        isError = true;
      } else {
        try {
          // Already trace-wrapped by registry.ts's register() — this call alone opens/closes
          // the trace row and streams tool_start/tool_end. Caught here only so one tool's
          // failure (no fallback defined) doesn't crash the whole conversation turn.
          toolResult = await def.handler(call.args, ctx);
        } catch (err) {
          toolResult = { error: String(err) };
          isError = true;
        }
      }
      messages.push({
        role: 'tool',
        content: [{ type: 'tool-result', toolCallId: call.toolCallId, toolName: call.toolName, result: toolResult, isError }],
      });
    }
  }

  ctx.stream.notice('Reached the step limit — here is what I have so far.');
  await persist(ctx, textParts, toolCallLog);
  ctx.stream.done();
}

function buildToolSet(names: string[]): ToolSet {
  const toolSet: ToolSet = {};
  for (const name of names) {
    const def = getRegistry().get(name);
    if (!def) continue;
    toolSet[name] = tool({ description: def.description, parameters: def.schema });
  }
  return toolSet;
}

async function persist(ctx: AgentContext, textParts: string[], toolCalls: Array<{ name: string; args: unknown }>): Promise<void> {
  const content = textParts.join('\n\n');
  if (!content && toolCalls.length === 0) return;
  await ConversationModel.addMessage(ctx.conversationId, 'assistant', content, toolCalls.length ? toolCalls : undefined);
}

export type { Phase };
