// tools/payment.tools.ts — bdapps_query_balance, bdapps_direct_debit. Class: 'gated' (§A.3, §C.7).
// The debit tool REFUSES unless TransactionModel.findApproved(externalTrxId) returns a row —
// the HITL guarantee, enforced in CODE, not the prompt. payment.controller.ts's approveAndDebit
// reuses processDirectDebit() below directly (same gate, same CaaS call — one gate, not two that
// could drift). propose/approve themselves are REST-only, not registered as agent tools: the
// farmer approves through the UI's explicit approval gate, not by saying "yes" in chat.
import { z } from 'zod';
import type { ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { FarmModel } from '../../models/farm.model';
import { UserModel } from '../../models/user.model';
import { TransactionModel } from '../../models/transaction.model';
import { env } from '../../config/env';
import { SimulatedCaasClient } from '../external/bdapps/caas.simulated';
import { LiveCaasClient } from '../external/bdapps/caas.live';
import type { CaasClient, BalanceResult, DebitResult } from '../external/bdapps/caas.interface';

export const caasClient: CaasClient = env.CAAS_MODE === 'live' ? new LiveCaasClient() : new SimulatedCaasClient();

/** A farmer's own phone is who the CaaS charge lands on — resolved via field → farm → user,
 * since ToolCtx only carries fieldId, not a farmer identity directly. Local format (no "tel:88"
 * prefix), matching how transactions.msisdn is stored — resolveSubscriberId() adds the prefix. */
export async function resolveUserPhone(fieldId: string): Promise<string> {
  const field = await FieldModel.getState(fieldId);
  const farm = await FarmModel.get(field.identity.farmId);
  if (!farm) throw new Error(`farm ${field.identity.farmId} not found`);
  const user = await UserModel.get(farm.user_id);
  if (!user) throw new Error(`user ${farm.user_id} not found`);
  return user.phone;
}

export async function resolveSubscriberId(fieldId: string): Promise<string> {
  return `tel:88${await resolveUserPhone(fieldId)}`;
}

/** The HITL guarantee (§C.7): refuses unless an approved transaction row exists — checked in
 * code, never inferred from conversation. Shared by the tool handler and payment.controller.ts
 * so there is exactly one gate. */
export async function processDirectDebit(externalTrxId: string): Promise<DebitResult> {
  const txn = await TransactionModel.findApproved(externalTrxId);
  if (!txn) {
    throw new Error(`transaction ${externalTrxId} is not approved — the farmer must approve via the UI before a debit can fire.`);
  }
  const subscriberId = `tel:88${txn.msisdn}`;
  const requestPayload = { externalTrxId, subscriberId, amount: String(txn.amount_bdt), currency: 'BDT' };
  const result = await caasClient.directDebit(requestPayload);
  await TransactionModel.recordResult(externalTrxId, {
    internal_trx_id: result.internalTrxId || undefined,
    reference_id: result.referenceId || undefined,
    status: result.statusCode,
    request_payload: requestPayload,
    response_payload: result,
  });
  return result;
}

const queryBalanceSchema = z.object({});

const directDebitSchema = z.object({
  externalTrxId: z
    .string()
    .min(1)
    .describe('The externalTrxId of an already farmer-approved transaction (from the checkout flow) — required, never invented.'),
});

export function registerPaymentTools(): void {
  register({
    name: 'bdapps_query_balance',
    description: "The farmer's current bdapps mobile-account chargeable balance — call before suggesting a payment.",
    schema: queryBalanceSchema,
    toolClass: 'gated',
    phases: ['MAINTAINING', 'TRANSACTING'],
    handler: async (_args, ctx): Promise<ToolResult<BalanceResult>> => {
      const subscriberId = await resolveSubscriberId(ctx.fieldId);
      const result = await caasClient.queryBalance(subscriberId);
      return {
        data: result,
        provenance: [{ source: 'bdapps CaaS (queryBalance)', method: 'api', retrievedAt: new Date().toISOString() }],
      };
    },
  });

  register({
    name: 'bdapps_direct_debit',
    description:
      'Charges the farmer via bdapps CaaS for an already-approved transaction. REFUSES if the transaction ' +
      "has not been approved through the UI's human-in-the-loop gate — this is enforced in code, not a suggestion.",
    schema: directDebitSchema,
    toolClass: 'gated',
    phases: ['TRANSACTING'],
    handler: async (args, _ctx): Promise<ToolResult<DebitResult>> => {
      const result = await processDirectDebit(args.externalTrxId);
      return {
        data: result,
        provenance: [{ source: 'bdapps CaaS (directDebit)', method: 'api', retrievedAt: new Date().toISOString() }],
      };
    },
  });
}
