// C — scenario simulation ("what if budget cut 40%?"). Returns a before/after diff (§A.1 T1).
import type { Request, Response } from 'express';

export async function postScenario(req: Request, res: Response) {
  // TODO: call simulate_scenario tool / engine with overrides; persist scenario_runs; return diff.
  res.status(501).json({ error: 'not implemented' });
}
