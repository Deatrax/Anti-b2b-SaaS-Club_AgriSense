// external/bdapps/caas.live.ts — same interface, real HTTP (§A.3). Toggle via CAAS_MODE=live.
// Auth is a legacy shared secret in the JSON body (applicationId + MD5 password) — no OAuth.
// NOTE: bdapps whitelists by originating IP (E1303) — venue Wi-Fi will not be provisioned.
import type { CaasClient, BalanceResult, DebitResult, DebitInput } from './caas.interface';
import { env } from '../../../config/env';

export class LiveCaasClient implements CaasClient {
  async queryBalance(_subscriberId: string): Promise<BalanceResult> {
    // TODO: POST `${env.BDAPPS_BASE_URL}/caas/balance/query` with applicationId + password (body).
    void env;
    throw new Error('LiveCaasClient.queryBalance not implemented (§A.3)');
  }

  async directDebit(_input: DebitInput): Promise<DebitResult> {
    // TODO: POST `${env.BDAPPS_BASE_URL}/caas/direct/debit`. Verify endpoint path against the
    //       local bdapps-API-DGD v1.1.3.pdf (docs cite both /caas/get/balance and /caas/balance/query).
    throw new Error('LiveCaasClient.directDebit not implemented (§A.3)');
  }
}
