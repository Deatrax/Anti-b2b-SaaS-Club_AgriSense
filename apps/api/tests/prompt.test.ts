// prompt.test.ts — buildSystemPrompt encodes the §4.9 answer shape and phase rules; toolsForPhase
// must read straight off each tool's registered `phases` so it can never drift from registry.ts.
import { describe, it, expect, beforeEach } from 'vitest';
import type { FieldState } from '@agrisense/shared';
import { buildSystemPrompt, toolsForPhase } from '../src/services/agent/prompt';
import { register, getRegistry } from '../src/services/tools/registry';

const identity: FieldState['identity'] = {
  id: 'f1',
  farmId: 'farm1',
  name: 'উত্তরের জমি',
  areaHa: 0.4,
  soilType: 'loam',
  waterSource: 'shallow_tubewell',
  lat: 24.7471,
  lon: 90.4203,
  budgetBdt: 40000,
};

const gatheringState: FieldState = { identity, activeCycle: null, missingFields: ['budget_bdt', 'target_season'] };
const planningState: FieldState = { identity, activeCycle: null, missingFields: [] };
const maintainingState: FieldState = {
  identity,
  missingFields: [],
  activeCycle: {
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
  },
};

describe('buildSystemPrompt', () => {
  it('always includes the role, the no-invented-numbers rule, and the answer shape', () => {
    const p = buildSystemPrompt(gatheringState, 'GATHERING');
    expect(p).toContain('AgriSense');
    expect(p).toMatch(/never state a number/);
    expect(p).toMatch(/cause → immediate action → prevention → source/);
  });

  it('includes the real field facts, not placeholders', () => {
    const p = buildSystemPrompt(gatheringState, 'GATHERING');
    expect(p).toContain('0.4 ha');
    expect(p).toContain('loam');
    expect(p).toContain('budget ৳40000');
    expect(p).toContain('Still missing: budget_bdt, target_season');
  });

  it('selects the GATHERING instruction and not another phase\'s', () => {
    const p = buildSystemPrompt(gatheringState, 'GATHERING');
    expect(p).toMatch(/at most 2 missing fields/);
    expect(p).not.toMatch(/work the full chain/i);
  });

  it('selects the PLANNING instruction', () => {
    const p = buildSystemPrompt(planningState, 'PLANNING');
    expect(p).toMatch(/Work the full chain without asking permission/);
  });

  it('selects the MAINTAINING instruction and includes the active cycle', () => {
    const p = buildSystemPrompt(maintainingState, 'MAINTAINING');
    expect(p).toMatch(/log_field_event/);
    expect(p).toContain('Active cycle: aman_rice (aman), stage tillering, day 20.');
  });

  it('selects the TRANSACTING instruction', () => {
    const p = buildSystemPrompt(maintainingState, 'TRANSACTING');
    expect(p).toMatch(/never debit without one/);
  });
});

describe('toolsForPhase', () => {
  beforeEach(() => {
    getRegistry().clear();
    register({
      name: 'gathering_only',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'field',
      phases: ['GATHERING'],
      handler: async () => ({ data: null, provenance: [] }),
    });
    register({
      name: 'planning_and_maintaining',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'deterministic',
      phases: ['PLANNING', 'MAINTAINING'],
      handler: async () => ({ data: null, provenance: [] }),
    });
  });

  it('returns only tools whose declared phases include the requested phase', () => {
    expect(toolsForPhase('GATHERING')).toEqual(['gathering_only']);
    expect(toolsForPhase('PLANNING')).toEqual(['planning_and_maintaining']);
    expect(toolsForPhase('MAINTAINING')).toEqual(['planning_and_maintaining']);
    expect(toolsForPhase('TRANSACTING')).toEqual([]);
  });
});
