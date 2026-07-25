// agent/phase.ts — derivePhase is CODE, not the LLM (§C.8). Letting the model choose its own
// phase is how agents get flaky, and flaky costs 15 points.
import type { FieldState, Phase } from '@agrisense/shared';

/**
 * Rules (§C.8), evaluated in priority order:
 *   approved proposal pending  → TRANSACTING (highest priority — a pending debit shouldn't wait
 *                                 behind intake questions or a stale plan)
 *   missingFields.length > 0   → GATHERING
 *   no active cycle            → PLANNING
 *   active cycle exists        → MAINTAINING
 *
 * `hasApprovedProposal` defaults to false: until Phase 7 wires bdapps CaaS, nothing ever
 * creates an approved transaction, so false is correct today, not a placeholder.
 */
export function derivePhase(field: FieldState, hasApprovedProposal = false): Phase {
  if (hasApprovedProposal) return 'TRANSACTING';
  if (field.missingFields.length > 0) return 'GATHERING';
  if (!field.activeCycle) return 'PLANNING';
  return 'MAINTAINING';
}
