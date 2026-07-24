// replan/trigger.service.ts — the differentiator (§A.2, §C.8). A farmer write → SCOPED replan
// → cards patch → agent speaks unprompted. Scope it: a soil fix must NOT re-rank crops mid-season.
import type { AgentStream } from '../agent/stream';
import { getRegistry, type ToolCtx } from '../tools/registry';
import { FieldModel } from '../../models/field.model';
import { LedgerModel } from '../../models/ledger.model';
import { PlanEventModel } from '../../models/planEvent.model';
import { ConversationModel } from '../../models/conversation.model';

function bdt(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}

const SCOPES: Record<string, string[]> = {
  irrigation: ['get_weather', 'lookup_crop_rules', 'build_season_plan'],
  fertilizer: ['lookup_crop_rules', 'build_season_plan', 'compute_financials'],
  soil_change: ['lookup_crop_rules', 'compute_financials'],
  budget: ['compute_financials'],
  observation: ['assess_pest_risk', 'search_knowledge_base'],
};

/** No live SSE connection exists for a replan triggered off a plain POST /fields/:id/log —
 * tool calls still get traced for real (registry.ts's trace wrapper calls TraceModel
 * unconditionally), this just discards the would-be UI stream events. */
function createNoopStream(): AgentStream {
  return {
    text: () => {},
    toolStart: () => {},
    toolEnd: () => {},
    notice: () => {},
    done: () => {},
  };
}

function argsForTool(name: string, crop: string | null): Record<string, unknown> {
  if ((name === 'lookup_crop_rules' || name === 'build_season_plan') && crop) return { crop };
  return {};
}

interface LedgerSnapshot {
  totalCost: number;
  byItem: Map<string, number>;
}

async function snapshotLedger(cropCycleId: string): Promise<LedgerSnapshot> {
  const lines = (await LedgerModel.listByCycle(cropCycleId)).filter((l) => !l.isActual && l.kind === 'cost');
  const byItem = new Map(lines.map((l) => [l.item, l.total]));
  return { totalCost: lines.reduce((sum, l) => sum + l.total, 0), byItem };
}

interface PlanSnapshot {
  byId: Map<string, { title: string; plannedDate: string | null }>;
}

async function snapshotPlan(cropCycleId: string): Promise<PlanSnapshot> {
  const events = await PlanEventModel.listByCycle(cropCycleId);
  return { byId: new Map(events.map((e) => [e.id, { title: e.title, plannedDate: e.plannedDate }])) };
}

export interface ReplanDiff {
  ranTools: string[];
  costChanged: boolean;
  totalCostBefore: number;
  totalCostAfter: number;
  shiftedEvents: { title: string; from: string | null; to: string | null }[];
}

const COST_SIGNIFICANCE_THRESHOLD_BDT = 1;

function isSignificant(diff: ReplanDiff): boolean {
  return diff.shiftedEvents.length > 0 || Math.abs(diff.totalCostAfter - diff.totalCostBefore) >= COST_SIGNIFICANCE_THRESHOLD_BDT;
}

function narrate(diff: ReplanDiff, kind: string): string {
  const parts: string[] = [];
  if (diff.shiftedEvents.length > 0) {
    const first = diff.shiftedEvents[0]!;
    parts.push(
      diff.shiftedEvents.length === 1
        ? `Moved "${first.title}" to ${first.to ?? 'a new date'}.`
        : `Moved ${diff.shiftedEvents.length} plan events, including "${first.title}" to ${first.to ?? 'a new date'}.`,
    );
  }
  if (Math.abs(diff.totalCostAfter - diff.totalCostBefore) >= COST_SIGNIFICANCE_THRESHOLD_BDT) {
    const delta = diff.totalCostAfter - diff.totalCostBefore;
    parts.push(`Projected cost ${delta > 0 ? 'rose' : 'fell'} by ${bdt(Math.abs(delta))} (now ${bdt(diff.totalCostAfter)}).`);
  }
  if (parts.length === 0) return `Logged your ${kind} update — no change to the plan or cost was needed.`;
  return `Updated your season plan after your ${kind} update: ${parts.join(' ')}`;
}

export async function onFieldWrite(fieldId: string, kind: string, _payload: unknown): Promise<ReplanDiff | null> {
  const toolNames = SCOPES[kind] ?? [];
  const field = await FieldModel.getState(fieldId);
  const cycle = field.activeCycle;
  if (!cycle) return null; // GATHERING/PLANNING — no active cycle to replan yet

  const [ledgerBefore, planBefore] = await Promise.all([snapshotLedger(cycle.id), snapshotPlan(cycle.id)]);

  const conversation = (await ConversationModel.getForField(fieldId)) ?? (await ConversationModel.create(fieldId));
  const ctx: ToolCtx = { conversationId: conversation.id, messageId: null, fieldId, stream: createNoopStream() };

  const ranTools: string[] = [];
  for (const name of toolNames) {
    const def = getRegistry().get(name);
    if (!def) continue; // not every scoped tool is registered yet (e.g. search_knowledge_base, Phase 6)
    try {
      await def.handler(argsForTool(name, cycle.crop), ctx);
      ranTools.push(name);
    } catch {
      // one tool's failure in a background replan must not crash the write — the trace row
      // already recorded the error; the farmer's log entry itself still succeeds.
    }
  }

  const [ledgerAfter, planAfter] = await Promise.all([snapshotLedger(cycle.id), snapshotPlan(cycle.id)]);

  const shiftedEvents: ReplanDiff['shiftedEvents'] = [];
  for (const [id, before] of planBefore.byId) {
    const after = planAfter.byId.get(id);
    if (after && after.plannedDate !== before.plannedDate) {
      shiftedEvents.push({ title: after.title, from: before.plannedDate, to: after.plannedDate });
    }
  }

  const diff: ReplanDiff = {
    ranTools,
    costChanged: ledgerAfter.totalCost !== ledgerBefore.totalCost,
    totalCostBefore: ledgerBefore.totalCost,
    totalCostAfter: ledgerAfter.totalCost,
    shiftedEvents,
  };

  if (ranTools.length > 0 && isSignificant(diff)) {
    await ConversationModel.postProactive(fieldId, narrate(diff, kind));
  }

  return diff;
}
