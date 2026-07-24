// M — bdapps transactions. findApproved() is the HITL GUARANTEE (§C.7): the debit tool
// refuses to fire unless an approved proposal row exists — enforced in code, not the prompt.
import { query } from '../config/db';
import { env } from '../config/env';

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

interface TransactionRawRow extends Omit<TransactionRow, 'amount_bdt'> {
  amount_bdt: string; // numeric column — raw from pg
}

function toTransactionRow(r: TransactionRawRow): TransactionRow {
  return { ...r, amount_bdt: Number(r.amount_bdt) };
}

export const TransactionModel = {
  async findApproved(externalTrxId: string): Promise<TransactionRow | null> {
    const [row] = await query<TransactionRawRow>(
      'select * from transactions where external_trx_id = $1 and approved_at is not null',
      [externalTrxId],
    );
    return row ? toTransactionRow(row) : null;
  },

  /** status='awaiting_approval' — the farmer must approve via the HITL gate before debit fires. */
  async propose(fieldId: string, externalTrxId: string, amountBdt: number, msisdn: string): Promise<void> {
    await query(
      `insert into transactions (field_id, external_trx_id, amount_bdt, msisdn, status, mode)
       values ($1,$2,$3,$4,'awaiting_approval',$5)`,
      [fieldId, externalTrxId, amountBdt, msisdn, env.CAAS_MODE],
    );
  },

  async approve(externalTrxId: string): Promise<void> {
    await query('update transactions set approved_at = now() where external_trx_id = $1', [externalTrxId]);
  },

  /** Persists internal_trx_id, reference_id, status + request/response payloads VERBATIM (§A.3)
   * so the trace panel can show real JSON. */
  async recordResult(
    externalTrxId: string,
    patch: {
      internal_trx_id?: string;
      reference_id?: string;
      status?: string;
      request_payload?: unknown;
      response_payload?: unknown;
    },
  ): Promise<void> {
    await query(
      `update transactions set
         internal_trx_id = coalesce($2, internal_trx_id),
         reference_id = coalesce($3, reference_id),
         status = coalesce($4, status),
         request_payload = coalesce($5::jsonb, request_payload),
         response_payload = coalesce($6::jsonb, response_payload)
       where external_trx_id = $1`,
      [
        externalTrxId,
        patch.internal_trx_id ?? null,
        patch.reference_id ?? null,
        patch.status ?? null,
        patch.request_payload != null ? JSON.stringify(patch.request_payload) : null,
        patch.response_payload != null ? JSON.stringify(patch.response_payload) : null,
      ],
    );
  },
};
