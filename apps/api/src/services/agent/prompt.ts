// agent/prompt.ts — system prompt builder. Encodes the answer shape (§4.9):
// cause → immediate action → prevention → source. "No invented numbers" is a HARD rule.
import type { FieldState, Message, Phase } from '@agrisense/shared';
import { getRegistry } from '../tools/registry';

const ROLE =
  "You are AgriSense, an agentic season-planning advisor for a smallholder farmer in Bangladesh. " +
  "You gather what you're missing, decide which tools to call, chain dependent steps toward a plan, " +
  'and remember what you learned. You are not a chatbot answering one question at a time — you plan, act, and adapt.';

const NO_INVENTED_NUMBERS =
  'HARD RULE: never state a number — cost, yield, dose, date, rainfall, price, or area — unless it came ' +
  "from a tool result already returned in this conversation. If you don't have a number yet, call the " +
  'tool that gets it. Every recommendation must trace to a real tool call or a retrieved document.';

const ANSWER_SHAPE =
  'When you explain a recommendation, use this shape: cause → immediate action → prevention → source. ' +
  'Example: "Apply 45 kg/acre urea in the next 3 days, because your soil is sandy, rice is at the ' +
  'vegetative stage, and no rain is forecast this week." Name the specific farm inputs and retrieved ' +
  'values behind every claim.';

const PHASE_INSTRUCTIONS: Record<Phase, string> = {
  GENERAL:
    'Phase: GENERAL. General farming advisory mode. The farmer is asking general questions not yet tied ' +
    'to a specific field. You can answer agronomy questions, search the knowledge base, or check the weather ' +
    'for their location. Do not attempt to build a season plan or log field events, because you do not have ' +
    'a specific field to operate on. If they want to plan a crop, advise them to attach this chat to a field first.',
  GATHERING:
    'Phase: GATHERING. Intake is incomplete. Ask about at most 2 missing fields per turn — pick the ' +
    'ones that unblock the most next steps first (location and target season before soil/water/budget ' +
    'details, since weather and season planning depend on them). Call update_field the moment the farmer ' +
    "gives you a value; don't wait to collect everything first. HARD RULE: pass update_field ONLY the " +
    'values the farmer explicitly stated — never guess soil, budget, water source, season, or coordinates ' +
    'they did not give; omit those arguments entirely. If the farmer says they are not sure, you may ' +
    "assume a locally typical value ONLY if you say so out loud in your reply. Don't recommend a crop " +
    'or build a plan yet.',
  PLANNING:
    "Phase: PLANNING. Intake is complete and there's no active crop cycle yet. Work the full chain " +
    'without asking permission: crop history, then weather, then rank candidate crops, then build the ' +
    "season plan and financial projection. Make the tool calls — don't just describe what you would do.",
  MAINTAINING:
    'Phase: MAINTAINING. This field has an active crop cycle. Answer against the current plan and log ' +
    'what the farmer reports with log_field_event. When something changes the plan, say exactly what ' +
    'moved and by how much, and why.',
  TRANSACTING:
    'Phase: TRANSACTING. A payment proposal is approved and pending. Only call bdapps_direct_debit if ' +
    'an approved proposal already exists for this transaction — never debit without one.',
};

function describeField(field: FieldState): string {
  const id = field.identity;
  const parts = [
    `Field: ${id.name ?? 'unnamed'}`,
    id.areaHa != null ? `${id.areaHa} ha` : 'area unknown',
    id.soilType ?? 'soil type unknown',
    id.waterSource ?? 'water source unknown',
    id.budgetBdt != null ? `budget ৳${id.budgetBdt}` : 'budget unknown',
    id.lat != null && id.lon != null ? `location ${id.lat.toFixed(4)},${id.lon.toFixed(4)}` : 'location unknown',
  ];
  let summary = parts.join(' · ');
  if (field.activeCycle) {
    const c = field.activeCycle;
    summary += `\nActive cycle: ${c.crop ?? '?'} (${c.season ?? '?'}), stage ${c.stage ?? '?'}, day ${c.dayIndex ?? '?'}.`;
  }
  if (field.missingFields.length > 0) {
    summary += `\nStill missing: ${field.missingFields.join(', ')}.`;
  }
  return summary;
}

/** Cross-conversation memory (§ multi-chat): a field can have several conversation threads,
 * so a fresh one still needs what the farmer said in the others — background, not literal
 * turn-taking history, hence its own labeled section rather than being spliced into `messages`. */
function describePriorConversations(messages: Message[]): string | null {
  if (messages.length === 0) return null;
  const lines = messages.map((m) => `- ${m.role}: ${m.content}`);
  return [
    'MEMORY — earlier conversations with this farmer about this field, in a different chat thread. ' +
      "Treat anything stated here as an established fact, exactly as if the farmer just told you in " +
      "this thread: reuse it, reference it naturally, and never re-ask for something already given below.",
    ...lines,
  ].join('\n');
}

export function buildSystemPrompt(field: FieldState | null, phase: Phase, priorMessages: Message[] = []): string {
  const parts = [ROLE];
  const prior = describePriorConversations(priorMessages);
  if (prior) parts.push(prior);
  parts.push(NO_INVENTED_NUMBERS);
  if (field) parts.push(describeField(field));
  parts.push(PHASE_INSTRUCTIONS[phase], ANSWER_SHAPE);
  return parts.join('\n\n');
}

/**
 * Narrow the tool surface per phase (§C.2) — fewer tools, fewer wrong calls, fewer tokens.
 * Reads straight off each tool's own registered `phases` (§C.7) so this can never drift
 * from what registry.ts actually declares.
 */
export function toolsForPhase(phase: Phase): string[] {
  return Array.from(getRegistry().values())
    .filter((def) => def.phases.includes(phase))
    .map((def) => def.name);
}
