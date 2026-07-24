// C — bdapps checkout. Propose basket → HITL approve → balance query → debit → receipt (§A.3).
import type { Request, Response } from 'express';

export async function proposeBasket(req: Request, res: Response) {
  // TODO: assemble basket from the plan's fertilizer rows; TransactionModel.propose (awaiting_approval).
  res.status(501).json({ error: 'not implemented' });
}

export async function approveAndDebit(req: Request, res: Response) {
  // TODO: TransactionModel.approve → bdapps_query_balance → bdapps_direct_debit (gated) → receipt.
  res.status(501).json({ error: 'not implemented' });
}
