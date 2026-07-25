// lib/api.ts — thin typed fetch wrapper to the Express API via the Next /api proxy (§C.1).
import type { FieldState, SeasonPlan, LedgerEntry, IntakeField, PlanEventStatus, Message, TraceEntry } from '@agrisense/shared';

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

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res));
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
export type ApiField = ApiFieldIdentity & Pick<FieldState, 'activeCycle' | 'targetSeason'> & { missingFields: IntakeField[] };

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

export interface ApiRiskWindow {
  id: string;
  cropCycleId: string;
  pest: string;
  level: 'low' | 'elevated' | 'high';
  startsOn: string | null;
  endsOn: string | null;
  trigger: unknown;
  prevention: string | null;
  treatment: string | null;
  estCostBdt: number | null;
  sources: unknown[];
}

export interface ApiFieldPlanResponse {
  plan: ApiPlan | null;
  financial: ApiFinancial;
  risk: ApiRiskWindow[];
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

export function createFarm(userId: string, name: string, district: string, userName?: string): Promise<{ farm: ApiFarm; user: ApiUser }> {
  return apiPost('/farms', { userId, name, district, userName });
}

// ---- Account settings ---------------------------------------------------------------------

export function updateUser(userId: string, patch: { name?: string; lang?: 'en' | 'bn' }): Promise<{ user: ApiUser }> {
  return apiPatch(`/users/${encodeURIComponent(userId)}`, patch);
}

export function deleteUser(userId: string): Promise<void> {
  return apiDelete(`/users/${encodeURIComponent(userId)}`);
}

export function listFields(farmId: string): Promise<{ fields: ApiField[] }> {
  return apiGet(`/farms/${encodeURIComponent(farmId)}/fields`);
}

export interface ApiRecentChat {
  fieldId: string;
  fieldName: string | null;
  conversationId: string;
  lastMessage: { role: string; content: string; createdAt: string };
}

/** Every conversation across the farm's fields (a field can have several, § multi-chat),
 * newest last-message first. */
export function listRecentChats(farmId: string, limit = 5, offset = 0): Promise<{ chats: ApiRecentChat[]; total: number }> {
  return apiGet(`/farms/${encodeURIComponent(farmId)}/chats?limit=${limit}&offset=${offset}`);
}

/** Also seeds the field's first conversation with the agent's intake greeting, so the farmer
 * lands in a chat the agent has already started (Tier 0 #1 conversational intake). */
export function createField(farmId: string, name?: string): Promise<{ field: ApiFieldIdentity; conversationId: string }> {
  return apiPost('/fields', { farmId, name });
}

export function getField(fieldId: string): Promise<ApiField> {
  return apiGet(`/fields/${encodeURIComponent(fieldId)}`);
}

export interface ApiFieldChatHistory {
  conversationId: string | null;
  messages: Message[];
  traces: TraceEntry[];
}

/** A field's default conversation — its most recently started one — for callers that don't
 * pick a specific thread (embedded Overview/Plan panels, opening Chat with no `?c=`). */
export function getFieldChatHistory(fieldId: string): Promise<ApiFieldChatHistory> {
  return apiGet(`/fields/${encodeURIComponent(fieldId)}/chat`);
}

export interface ApiConversation {
  id: string;
  fieldId: string;
  title: string | null;
  createdAt: string;
}

/** A field can have several conversations (§ multi-chat) — this starts a fresh one. */
export function createFieldConversation(fieldId: string): Promise<{ conversation: ApiConversation }> {
  return apiPost(`/fields/${encodeURIComponent(fieldId)}/conversations`, {});
}

export interface ApiConversationHistory {
  conversation: ApiConversation;
  messages: Message[];
  traces: TraceEntry[];
}

/** One exact thread by id — what "recent chats" / "all chats" open, as opposed to
 * getFieldChatHistory's "whichever is most recent" default. */
export function getConversation(conversationId: string): Promise<ApiConversationHistory> {
  return apiGet(`/conversations/${encodeURIComponent(conversationId)}`);
}

export function getFieldPlan(fieldId: string): Promise<ApiFieldPlanResponse> {
  return apiGet(`/fields/${encodeURIComponent(fieldId)}/plan`);
}

/** Plan tab's "Done" button. Marking the harvest stage done completes the whole cycle —
 * the field re-enters PLANNING and the agent proposes the next season in chat. */
export function markPlanEventDone(eventId: string): Promise<{ event: ApiPlanTimelineEntry; cycleCompleted: boolean }> {
  return apiPatch(`/plan-events/${encodeURIComponent(eventId)}/done`, {});
}

// ---- Phase 8: field log + scoped replan --------------------------------------------------

export interface ApiFieldLog {
  id: string;
  field_id: string;
  crop_cycle_id: string | null;
  kind: string;
  payload: unknown;
  logged_by: string;
  occurred_at: string;
}

export interface ApiReplanDiff {
  ranTools: string[];
  costChanged: boolean;
  totalCostBefore: number;
  totalCostAfter: number;
  shiftedEvents: { title: string; from: string | null; to: string | null }[];
}

export function postFieldLog(
  fieldId: string,
  kind: 'irrigation' | 'fertilizer' | 'pest' | 'observation',
  input: { description?: string; quantity?: number; unit?: string },
): Promise<{ log: ApiFieldLog; diff: ApiReplanDiff | null }> {
  return apiPost(`/fields/${encodeURIComponent(fieldId)}/log`, { kind, ...input });
}

// ---- Phase 8: scenario simulation --------------------------------------------------------

export interface ApiFinancialHeadline {
  totalCost: number;
  expectedYieldKg: number;
  grossRevenue: number;
  netProfit: number;
  roi: number;
  bcr: number;
  breakEvenYieldKg: number;
  breakEvenPrice: number;
}

export interface ApiScenarioOverrides {
  label?: string;
  weatherAdj?: number;
  inputAdj?: number;
  farmgatePriceBdtPerKg?: number;
  costMultiplier?: number;
}

export interface ApiScenarioResponse {
  id: string;
  label: string;
  overrides: ApiScenarioOverrides;
  baseline: ApiFinancialHeadline;
  scenario: ApiFinancialHeadline;
  diff: Pick<ApiFinancialHeadline, 'totalCost' | 'expectedYieldKg' | 'grossRevenue' | 'netProfit' | 'roi' | 'bcr'>;
}

export function postScenario(fieldId: string, overrides: ApiScenarioOverrides): Promise<ApiScenarioResponse> {
  return apiPost(`/fields/${encodeURIComponent(fieldId)}/scenario`, overrides);
}

// ---- Phase 7: bdapps CaaS checkout --------------------------------------------------------

export interface ApiBasketItem {
  id: string;
  item: string;
  qty: number | null;
  unit: string | null;
  unitCost: number | null;
  total: number;
}

export interface ApiBasketResponse {
  externalTrxId: string;
  items: ApiBasketItem[];
  totalBdt: number;
  balanceBdt: number;
}

export function proposeBasket(fieldId: string): Promise<ApiBasketResponse> {
  return apiPost('/payment/propose', { fieldId });
}

export interface ApiReceipt {
  externalTrxId: string;
  internalTrxId: string | null;
  referenceId: string | null;
  amountBdt: number;
  msisdn: string | null;
  status: string;
  mode: string;
  approvedAt: string | null;
}

export function approveAndDebit(externalTrxId: string): Promise<{ receipt: ApiReceipt }> {
  return apiPost('/payment/approve', { externalTrxId });
}
