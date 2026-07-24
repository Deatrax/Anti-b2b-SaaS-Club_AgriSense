// tools/payment.tools.ts — bdapps_query_balance, bdapps_direct_debit. Class: 'gated' (§A.3, §C.7).
// The debit tool REFUSES unless TransactionModel.findApproved(externalTrxId) returns a row —
// the HITL guarantee, enforced in CODE, not the prompt.
export function registerPaymentTools(): void {
  // TODO: register both CaaS tools against the CaasClient interface (simulated by default).
  //   bdapps_direct_debit handler MUST check findApproved() first and throw if absent.
}
