// M — bdapps transactions. findApproved() is the HITL GUARANTEE (§C.7): the debit tool
// refuses to fire unless an approved proposal row exists — enforced in code, not the prompt.
import { query } from '../config/db';

export interface TransactionRow {
  id: string;
  field_id: string | null;
  external_trx_id: string;
  internal_trx_id: string | null;
  reference_id: string | null;
  amount_bdt: number;
  msisdn: string | null;
  status: string;
  mode: string; // live | simulated
  approved_at: string | null;
}

export const TransactionModel = {
  async findApproved(externalTrxId: string): Promise<TransactionRow | null> {
    const [row] = await query<TransactionRow>(
      'select * from transactions where external_trx_id = $1 and approved_at is not null',
      [externalTrxId],
    );
    return row ?? null;
  },

  async propose(fieldId: string, externalTrxId: string, amountBdt: number, msisdn: string): Promise<void> {
    // TODO: insert status='awaiting_approval'; farmer approves via the HITL gate before debit.
    void fieldId;
    void externalTrxId;
    void amountBdt;
    void msisdn;
  },

  async approve(externalTrxId: string): Promise<void> {
    await query('update transactions set approved_at = now() where external_trx_id = $1', [externalTrxId]);
  },

  async recordResult(
    externalTrxId: string,
    patch: { internal_trx_id?: string; reference_id?: string; status?: string; request_payload?: unknown; response_payload?: unknown },
  ): Promise<void> {
    // TODO: persist internal_trx_id, reference_id, status + request/response payloads VERBATIM (§A.3).
    void externalTrxId;
    void patch;
  },
};
