// services/channels/sms.channel.ts — the SMS fast path (Plan B). NOT the full agent loop:
// a measured PLANNING/MAINTAINING turn through runAgent() takes 20-30s (a chained multi-tool
// loop — crop history, weather, ranking, planning, financials), 2.5-3.7x the webhook's ~8s
// budget (measured live, 2026-07-25: GATHERING/no-tool turns ~3s, a 2-tool MAINTAINING turn
// ~21s, the full 6-tool PLANNING chain ~28s). This does ONE retrieve() + ONE generateText()
// instead — real RAG grounding, no live weather/financial tool calls — to answer in budget.
import { generateText, type ModelMessage } from 'ai';
import { UserModel } from '../../models/user.model';
import { FarmModel } from '../../models/farm.model';
import { FieldModel } from '../../models/field.model';
import { ConversationModel } from '../../models/conversation.model';
import { retrieve, type RetrieveResult } from '../rag/retrieve';
import { selectModel } from '../../controllers/chat.controller';

export interface SmsRequest {
  msisdn: string;
  message: string;
  requestId: string;
}

export interface SmsReply {
  reply: string;
  status: 'ok' | 'error';
}

const REPLY_MAX_CHARS = 280;
const HISTORY_TURNS = 6;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // covers a webhook retry of the same requestId

const SMS_SYSTEM_PROMPT = [
  'You are AgriSense, an agronomic advisor answering a Bangladeshi farmer over SMS.',
  'Answer only in Bangla, plain text, no markdown, no preamble — one practical, actionable answer, at most 280 characters.',
  'Only state a number (dose, cost, date, yield) if it appears in the retrieved notes below — otherwise give ' +
    'qualitative guidance and do not invent it.',
  'If the question needs a live weather forecast, a current market price, or a full costed season plan, say ' +
    'briefly that this needs the AgriSense app or a call, and still give the best general guidance you can from the notes.',
].join(' ');

// Only successful turns are cached: a transient failure (LLM/DB hiccup) should get a fresh
// attempt on retry, not a frozen error, while a real answer must never be recomputed.
const idempotencyCache = new Map<string, SmsReply>();

function cacheGet(requestId: string): SmsReply | undefined {
  return idempotencyCache.get(requestId);
}

function cacheSet(requestId: string, reply: SmsReply): void {
  idempotencyCache.set(requestId, reply);
  setTimeout(() => idempotencyCache.delete(requestId), IDEMPOTENCY_TTL_MS).unref();
}

function truncate(text: string, max = REPLY_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const boundary = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${boundary.trim()}…`;
}

/**
 * msisdn → its field, auto-provisioning a bare user/farm/field on first contact so
 * conversation memory persists across SMS turns (Tier 0 memory — §3), reusing the exact
 * tables/models the web UI reads. No SMS-only shadow store, no context-free special case:
 * a first-time SMS farmer just becomes a first-time field, same as a first-time web visitor.
 */
async function resolveField(msisdn: string): Promise<string> {
  const user = (await UserModel.findByPhone(msisdn)) ?? (await UserModel.create(msisdn));
  const farms = await FarmModel.listByUser(user.id);
  const farm = farms[0] ?? (await FarmModel.create(user.id, { name: `${msisdn} এর খামার` }));
  const fields = await FieldModel.listByFarm(farm.id);
  if (fields[0]) return fields[0].identity.id;
  const created = await FieldModel.create(farm.id);
  return created.id;
}

export async function answerSms({ msisdn, message, requestId }: SmsRequest): Promise<SmsReply> {
  const cached = cacheGet(requestId);
  if (cached) return cached;

  try {
    const fieldId = await resolveField(msisdn);
    const field = await FieldModel.getState(fieldId);

    // farm.get()->retrieve() and the conversation/history chain are independent of each
    // other (retrieval only needs field/farm context, not persisted history) — measured
    // live 2026-07-25: running them sequentially put a first-contact msisdn (several extra
    // inserts to bootstrap user/farm/field) over the 7s deadline. Run them concurrently.
    const [retrieved, { conversationId, messages }] = await Promise.all([
      FarmModel.get(field.identity.farmId).then((farm) =>
        retrieve({
          crop: field.activeCycle?.crop ?? undefined,
          stage: field.activeCycle?.stage ?? undefined,
          topic: message,
          soilType: field.identity.soilType ?? undefined,
          aez: farm?.aez ?? undefined,
        }).catch((): RetrieveResult => ({ query: message, hits: [] })),
      ),
      (async (): Promise<{ conversationId: string; messages: ModelMessage[] }> => {
        const conversation = (await ConversationModel.getForField(fieldId)) ?? (await ConversationModel.create(fieldId));
        // Persist-then-fetch (not fetch-then-append): recentMessages() already returns
        // this turn as the last entry, so the prompt never carries a duplicated message.
        await ConversationModel.addMessage(conversation.id, 'user', message);
        const history = await ConversationModel.recentMessages(conversation.id, HISTORY_TURNS);
        return {
          conversationId: conversation.id,
          messages: history
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
        };
      })(),
    ]);

    const notesBlock = retrieved.hits.length
      ? `Retrieved notes (cite only these for any number):\n${retrieved.hits.map((h) => `- [${h.source}] ${h.content}`).join('\n')}`
      : 'No matching notes were found for this question — answer from general safe agronomic practice only.';

    const result = await generateText({
      model: selectModel(),
      system: `${SMS_SYSTEM_PROMPT}\n\n${notesBlock}`,
      messages,
    });

    const reply = truncate(result.text || 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। পরে আবার চেষ্টা করুন।');

    // Fire-and-forget: persisting the reply doesn't need to block the SMS response, and a
    // failure here only costs future-turn memory, not this answer.
    ConversationModel.addMessage(conversationId, 'assistant', reply).catch((err) =>
      console.error(`[agent/sms] ${requestId} failed to persist assistant reply:`, err),
    );

    const out: SmsReply = { reply, status: 'ok' };
    cacheSet(requestId, out);
    return out;
  } catch (err) {
    console.error(`[agent/sms] ${requestId} failed:`, err);
    return { reply: '', status: 'error' };
  }
}
