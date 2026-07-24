// agent/prompt.ts — system prompt builder. Encodes the answer shape (§4.9):
// cause → immediate action → prevention → source. "No invented numbers" is a HARD rule.
import type { FieldState, Phase } from '@agrisense/shared';

export function buildSystemPrompt(_field: FieldState, _phase: Phase): string {
  // TODO: compose role + current field state + phase-specific instructions + the answer template.
  return 'TODO: AgriSense system prompt (§C.2, §4.9).';
}

/** Narrow the tool surface per phase (§C.2) — fewer tools, fewer wrong calls, fewer tokens. */
export function toolsForPhase(_phase: Phase): string[] {
  // TODO: e.g. GATHERING → ['get_field_state', 'update_field'].
  return [];
}
