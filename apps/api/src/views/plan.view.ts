// V — season plan serializer: PlanEvent rows → timeline + NextSteps card payload.
import type { SeasonPlan } from '@agrisense/shared';
import { toDhakaDate } from './date';

export function serializePlan(plan: SeasonPlan | null) {
  if (!plan) return null;
  return {
    id: plan.id,
    cropCycleId: plan.cropCycleId,
    revision: plan.revision,
    weatherSnapshot: plan.weatherSnapshot,
    generatedAt: plan.generatedAt,
    timeline: [...plan.events]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((e) => ({
        id: e.id,
        stageKey: e.stageKey,
        title: e.title,
        action: e.action,
        quantity: e.quantity,
        unit: e.unit,
        plannedDate: toDhakaDate(e.plannedDate),
        actualDate: toDhakaDate(e.actualDate),
        status: e.status,
        shiftReason: e.shiftReason,
        sources: e.sources,
      })),
  };
}
