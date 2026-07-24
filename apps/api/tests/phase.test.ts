// phase.test.ts — derivePhase is CODE, not the LLM (§C.8). A flaky phase choice costs 15 points,
// so every branch of the priority order gets a direct assertion.
import { describe, it, expect } from 'vitest';
import type { FieldState } from '@agrisense/shared';
import { derivePhase } from '../src/services/agent/phase';

const baseIdentity: FieldState['identity'] = {
  id: 'f1',
  farmId: 'farm1',
  name: 'Test field',
  areaHa: 0.4,
  soilType: 'loam',
  waterSource: 'shallow_tubewell',
  lat: 24.7,
  lon: 90.4,
  budgetBdt: 40000,
};

function state(overrides: Partial<FieldState>): FieldState {
  return { identity: baseIdentity, activeCycle: null, missingFields: [], ...overrides };
}

describe('derivePhase', () => {
  it('GATHERING when any intake field is missing', () => {
    expect(derivePhase(state({ missingFields: ['budget_bdt'] }))).toBe('GATHERING');
  });

  it('PLANNING when intake is complete but there is no active cycle', () => {
    expect(derivePhase(state({ missingFields: [], activeCycle: null }))).toBe('PLANNING');
  });

  it('MAINTAINING when an active cycle exists', () => {
    const cycle: FieldState['activeCycle'] = {
      id: 'c1',
      fieldId: 'f1',
      crop: 'aman_rice',
      variety: null,
      season: 'aman',
      sowingDate: null,
      expectedHarvest: null,
      status: 'active',
      stage: 'tillering',
      dayIndex: 20,
      actualYieldKg: null,
    };
    expect(derivePhase(state({ activeCycle: cycle }))).toBe('MAINTAINING');
  });

  it('TRANSACTING overrides everything else when a proposal is approved', () => {
    expect(derivePhase(state({ missingFields: ['budget_bdt'] }), true)).toBe('TRANSACTING');
  });

  it('defaults hasApprovedProposal to false', () => {
    expect(derivePhase(state({ missingFields: [] }))).toBe('PLANNING');
  });
});
