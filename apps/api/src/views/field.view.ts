// V — field serializer. DB/domain state → the JSON shape the dashboard renders.
// This file is a SEAM (Mahim → Masnun): agree the shape once, build against it (§C.3).
import type { FieldState } from '@agrisense/shared';

export function serializeField(state: FieldState) {
  // TODO: shape identity + activeCycle + missingFields into the workspace card payload.
  return state;
}
