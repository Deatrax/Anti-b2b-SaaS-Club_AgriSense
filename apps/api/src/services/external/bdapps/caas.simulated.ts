// external/bdapps/caas.simulated.ts — the DEFAULT client (§A.3). Models the contract, not a
// 200-stub: exact response shapes, real status codes, 300–600ms latency, injectable failure paths.
import type { CaasClient, BalanceResult, DebitResult, DebitInput } from './caas.interface';

export class SimulatedCaasClient implements CaasClient {
  async queryBalance(_subscriberId: string): Promise<BalanceResult> {
    // TODO: schema-correct BalanceResult (S1000) after realistic latency;
    //       support a deliberately-triggerable insufficient-balance path.
    throw new Error('SimulatedCaasClient.queryBalance not implemented (§A.3)');
  }

  async directDebit(_input: DebitInput): Promise<DebitResult> {
    // TODO: return internalTrxId + referenceId (S1000); support an auth-failure path (E1313).
    //       Log request + response payloads VERBATIM so the trace shows real JSON.
    throw new Error('SimulatedCaasClient.directDebit not implemented (§A.3)');
  }
}
