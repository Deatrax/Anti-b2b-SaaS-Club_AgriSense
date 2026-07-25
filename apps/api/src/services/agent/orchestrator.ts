// agent/orchestrator.ts — the hand-rolled tool loop (§C.2). No framework: Vercel AI SDK
// tool primitives + a bounded loop with a hard step cap and a GRACEFUL exit (not a throw).
// Message/tool shapes target AI SDK v7 (package.json's "ai": "^7.0.37") — v5 renamed
// CoreMessage → ModelMessage, tool.parameters → tool.inputSchema, tool-call.args → .input,
// and tool-result content parts from {result, isError} to a typed `output` discriminated
// union ({type:'json'|'error-json', value}). Fixed 2026-07-25: the original hand-rolled
// message construction was written against the pre-v5 shape and failed every turn with
// AI_InvalidPromptError ("messages do not match the ModelMessage[] schema").
import { streamText, tool, type ModelMessage, type LanguageModel, type ToolSet, type JSONValue } from 'ai';
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

/** Tool results can carry live pg Date objects (the models' row types say `string`, but that
 * is compile-time only — node-postgres returns Date instances for date/timestamp columns).
 * The AI SDK validates tool-result `value`s as JSONValue on the NEXT streamText call, so a
 * Date instance kills the following reasoning step with AI_InvalidPromptError. Round-tripping
 * through JSON converts Dates → ISO strings and drops undefined. */
export function toJsonSafe(value: unknown): JSONValue {
  try {
    return JSON.parse(JSON.stringify(value)) as JSONValue;
  } catch {
    return { error: 'tool result was not JSON-serializable' };
  }
}

export async function runAgent(ctx: AgentContext, userMessage: string): Promise<void> {
  const field = await FieldModel.getState(ctx.fieldId);
  const phase = derivePhase(field); // TRANSACTING wiring lands in Phase 7 — no proposals exist yet

  // History is fetched BEFORE the user message is inserted — fetching after put the just-added
  // message in `history` AND in the explicit push below, so the model saw every farmer message twice.
  const [history, priorMessages] = await Promise.all([
    ConversationModel.recentMessages(ctx.conversationId, 20),
    ConversationModel.recentMessagesForFieldExcluding(ctx.fieldId, ctx.conversationId, 10),
  ]);
  await ConversationModel.addMessage(ctx.conversationId, 'user', userMessage);
  const messages: ModelMessage[] = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
    { role: 'user', content: userMessage },
  ];

  const system = buildSystemPrompt(field, phase, priorMessages);
  const tools = buildToolSet(toolsForPhase(phase));
  const textParts: string[] = [];
  const toolCallLog: Array<{ name: string; args: unknown }> = [];

  for (let step = 1; step <= MAX_STEPS; step++) {
    // streamText, not generateText — text deltas reach the farmer's screen as the model
    // produces them (real token streaming end-to-end over the SSE pipe), instead of one
    // block per reasoning step. Errors surface while consuming textStream, so the whole
    // consume-then-await sequence sits inside one try.
    let stepText = '';
    let stepToolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>;
    let responseMessages: ModelMessage[];
    try {
      const result = streamText({
        model: ctx.model,
        system,
        messages,
        tools,
        toolChoice: step === 1 && phase === 'PLANNING' ? 'required' : 'auto',
        // 0, not the provider's 1.0 default: at temp 1 gpt-4o pads update_field with guessed
        // soil/budget/season values the farmer never said — a direct no-invented-numbers
        // violation. An advisory agent gets no benefit from sampling variety.
        temperature: 0,
      });
      for await (const delta of result.textStream) {
        if (!delta) continue;
        ctx.stream.text(delta);
        stepText += delta;
      }
      stepToolCalls = (await result.toolCalls) as typeof stepToolCalls;
      responseMessages = (await result.responseMessages) as ModelMessage[];
    } catch (err) {
      // Name the actual failure class: blaming "the model is unavailable" for our own
      // message-construction bugs misdirected an hour of live debugging on 25 Jul.
      const name = err instanceof Error ? err.name : 'UnknownError';
      const friendly =
        name === 'AI_APICallError' || name === 'AI_RetryError' || name === 'AI_LoadAPIKeyError'
          ? 'The reasoning model is unreachable right now — please try again.'
          : 'The agent hit an internal error this turn — details are in the server log.';
      console.error('[agent] turn failed:', err);
      ctx.stream.notice(`⚠ ${friendly} (${name})`);
      await persist(ctx, textParts, toolCallLog);
      ctx.stream.done();
      return;
    }

    if (stepText) textParts.push(stepText);
    messages.push(...responseMessages);

    if (!stepToolCalls.length) {
      await persist(ctx, textParts, toolCallLog);
      ctx.stream.done();
      return;
    }

    for (const call of stepToolCalls) {
      toolCallLog.push({ name: call.toolName, args: call.input });
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
          toolResult = await def.handler(call.input, ctx);
        } catch (err) {
          toolResult = { error: String(err) };
          isError = true;
        }
      }
      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            output: isError ? { type: 'error-json', value: toJsonSafe(toolResult) } : { type: 'json', value: toJsonSafe(toolResult) },
          },
        ],
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
    toolSet[name] = tool({ description: def.description, inputSchema: def.schema });
  }
  return toolSet;
}

async function persist(ctx: AgentContext, textParts: string[], toolCalls: Array<{ name: string; args: unknown }>): Promise<void> {
  const content = textParts.join('\n\n');
  if (!content && toolCalls.length === 0) return;
  await ConversationModel.addMessage(ctx.conversationId, 'assistant', content, toolCalls.length ? toolCalls : undefined);
}

export type { Phase };
