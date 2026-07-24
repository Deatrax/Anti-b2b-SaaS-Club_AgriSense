// THE test that scores (§C.9): "change an input → outputs change correctly" (Tier-0 #5).
// Fill these in as the engine lands — they satisfy the consistency clause + the "working tests" line.
import { describe, it } from 'vitest';
// import { computeFinancials } from '../src/services/engines/financial.engine';

describe('financial.engine (§C.9 — the test that scores)', () => {
  it.todo('doubling area doubles total cost');
  it.todo('net_profit = gross_revenue − total_cost');
  it.todo('bcr = gross_revenue / total_cost');
  it.todo('break_even_yield × farmgate_price = total_cost');
  it.todo('zero area does not divide by zero');
  it.todo('an input override propagates to every dependent figure');
  it.todo('Boro HYV sanity anchor: BCR ≈ 1.9–2.3');
});
