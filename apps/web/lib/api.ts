// lib/api.ts — thin typed fetch wrapper to the Express API via the Next /api proxy (§C.1).
import type { FieldState, SeasonPlan, LedgerEntry, IntakeField, PlanEventStatus } from '@agrisense/shared';

const BASE = '/api';

/** Every controller error response is `{error: string}` (validate.middleware.ts,
 * error.middleware.ts, and every controller's own catch block) — surface that real message
 * instead of just the status code, so e.g. an unknown district shows why, not just "400". */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}

// ---- Wire shapes — mirror what the controllers actually return today, not an idealized shape.

export interface ApiUser {
  id: string;
  phone: string;
  name: string | null;
  lang: string;
}

/** Raw FarmRow — farm.controller.ts/farm.model.ts don't run this through a view/serializer yet. */
export interface ApiFarm {
  id: string;
  user_id: string;
  name: string | null;
  district: string | null;
  lat: number | null;
  lon: number | null;
  aez: number | null;
}

export interface ApiFieldIdentity {
  id: string;
  farmId: string;
  name: string | null;
  areaHa: number | null;
  soilType: string | null;
  waterSource: string | null;
  lat: number | null;
  lon: number | null;
  budgetBdt: number | null;
}

/** field.view.ts's serializeField() output. */
export type ApiField = ApiFieldIdentity & Pick<FieldState, 'activeCycle'> & { missingFields: IntakeField[] };

export interface ApiPlanTimelineEntry {
  id: string;
  stageKey: string;
  title: string;
  action: string | null;
  quantity: number | null;
  unit: string | null;
  plannedDate: string | null;
  actualDate: string | null;
  status: PlanEventStatus;
  shiftReason: string | null;
  sources: SeasonPlan['events'][number]['sources'];
}

export interface ApiPlan {
  id: string;
  cropCycleId: string;
  revision: number;
  weatherSnapshot: unknown;
  generatedAt: string;
  timeline: ApiPlanTimelineEntry[];
}

export interface ApiLedgerLine {
  id: string;
  kind: LedgerEntry['kind'];
  item: string;
  qty: number | null;
  unit: string | null;
  unitCost: number | null;
  total: number;
  source: string | null;
  assumption: string | null;
  occurredOn: string | null;
}

export interface ApiFinancial {
  projected: ApiLedgerLine[];
  actual: ApiLedgerLine[];
}

export interface ApiFieldPlanResponse {
  plan: ApiPlan | null;
  financial: ApiFinancial;
}

// ---- Calls ------------------------------------------------------------------------------

export function requestOtp(phone: string): Promise<{ referenceNo: string }> {
  return apiPost('/auth/otp/request', { phone });
}

export function verifyOtp(referenceNo: string, otp: string, name?: string, lang?: string): Promise<{ user: ApiUser; farms: ApiFarm[] }> {
  return apiPost('/auth/otp/verify', { referenceNo, otp, name, lang });
}

export function listFarms(userId: string): Promise<{ farms: ApiFarm[] }> {
  return apiGet(`/farms?userId=${encodeURIComponent(userId)}`);
}

export function createFarm(userId: string, name: string, district: string): Promise<{ farm: ApiFarm }> {
  return apiPost('/farms', { userId, name, district });
}

export function listFields(farmId: string): Promise<{ fields: ApiField[] }> {
  return apiGet(`/farms/${encodeURIComponent(farmId)}/fields`);
}

export function createField(farmId: string, name?: string): Promise<{ field: ApiFieldIdentity }> {
  return apiPost('/fields', { farmId, name });
}

export function getField(fieldId: string): Promise<ApiField> {
  return apiGet(`/fields/${encodeURIComponent(fieldId)}`);
}

export function getFieldPlan(fieldId: string): Promise<ApiFieldPlanResponse> {
  return apiGet(`/fields/${encodeURIComponent(fieldId)}/plan`);
}
