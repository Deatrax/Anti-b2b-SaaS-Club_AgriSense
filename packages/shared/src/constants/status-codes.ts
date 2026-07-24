// bdapps CaaS confirmed status codes (bdapps-API-DGD v1.1.3, Appendix A).
// Use these EXACT values in the simulator — do NOT invent (§A.3).

export const CAAS_STATUS = {
  SUCCESS: 'S1000',             // Success
  AUTH_FAILED: 'E1313',        // No such active application, or invalid password
  IP_NOT_PROVISIONED: 'E1303', // Originating IP not provisioned (venue Wi-Fi trap)
  INVALID_REQUEST: 'E1312',    // Missing / malformed mandatory field
  INVALID_MSISDN: 'E1317',     // MSISDN invalid or not allowed
} as const;

export type CaasStatusCode = (typeof CAAS_STATUS)[keyof typeof CAAS_STATUS];
