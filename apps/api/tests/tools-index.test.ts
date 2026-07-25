// tools-index.test.ts — without this bootstrap, the registry stays empty and the agent has
// zero tools at runtime regardless of what each *.tools.ts file registers (found while
// re-checking Phase 3: nothing called the register*Tools() functions outside tests).
//
// registerAllTools()'s idempotency guard is a module-level flag, decoupled from the registry
// Map itself — so each test resets the whole module graph (vi.resetModules) and re-imports,
// rather than sharing one instance across tests where a stale `registered=true` would mask
// what's actually being tested.
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('registerAllTools', () => {
  it('populates the registry with the real, implemented tools', async () => {
    const { getRegistry } = await import('../src/services/tools/registry');
    const { registerAllTools } = await import('../src/services/tools');

    registerAllTools();

    const names = Array.from(getRegistry().keys());
    expect(names).toEqual(
      expect.arrayContaining(['get_weather', 'get_field_state', 'update_field', 'log_field_event', 'get_crop_history']),
    );
  });

  it('is idempotent — a second call does not throw or duplicate entries', async () => {
    const { getRegistry } = await import('../src/services/tools/registry');
    const { registerAllTools } = await import('../src/services/tools');

    registerAllTools();
    const firstCount = getRegistry().size;
    expect(firstCount).toBeGreaterThan(0);

    registerAllTools();
    expect(getRegistry().size).toBe(firstCount);
  });
});
