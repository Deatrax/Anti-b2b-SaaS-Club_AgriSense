// V — season plan serializer: PlanEvent rows → timeline + NextSteps card payload.
import type { SeasonPlan } from '@agrisense/shared';

export function serializePlan(plan: SeasonPlan) {
  // TODO: sort events; expose shift_reason + sources for the timeline/Why panel.
  return plan;
}
