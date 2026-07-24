// agent/phase.ts — derivePhase is CODE, not the LLM (§C.8). Letting the model choose its own
// phase is how agents get flaky, and flaky costs 15 points.
import type { FieldState, Phase } from '@agrisense/shared';

export function derivePhase(_field: FieldState /* , hasApprovedProposal: boolean */): Phase {
  // Rules (§C.8):
  //   missingFields.length > 0   → GATHERING
  //   no active cycle            → PLANNING
  //   active cycle exists        → MAINTAINING
  //   approved proposal pending  → TRANSACTING
  // TODO: implement.
  return 'GATHERING';
}
