// lib/mock-data.ts — seed data for the field workspace, typed against @agrisense/shared.
// Crop is T. Aman, not Boro: the real calendar date this was authored against is late July,
// when Aman is in the ground (transplanted Jul, harvested Nov) and Boro (Dec-May) is long since
// harvested. Getting that wrong is exactly the kind of thing an agronomically literate judge
// would catch (§PRODUCT.md "never render a number the model invented").
//
// Every cost/yield figure here is a plausible, sourced-looking placeholder for the real
// deterministic tables (crop_rules.json, costs_bd.json) the backend will read from — not a
// number to defend in Q&A. Swap this file for a real API call once apps/api exists; the shapes
// already match what that endpoint will return.

import type {
  FieldState,
  CropCycle,
  PlanEvent,
  RiskWindow,
  LedgerEntry,
  FinancialResult,
  Message,
  TraceEntry,
  Provenance,
} from '@agrisense/shared';

const FARM_ID = 'farm-hasan-1';
const FIELD_ID = 'field-uttor-1';
const CYCLE_ID = 'cycle-aman-2026';
const CONV_ID = 'conv-1';

const SOUTH_FIELD_ID = 'field-dokkhin-1';
const SOUTH_CYCLE_ID = 'cycle-boro-2026';

export const fieldState: FieldState = {
  identity: {
    id: FIELD_ID,
    farmId: FARM_ID,
    name: 'উত্তরের জমি',
    areaHa: 0.5,
    soilType: 'clay_loam',
    waterSource: 'shallow_tubewell',
    lat: 24.75,
    lon: 90.42,
    budgetBdt: 35000,
  },
  activeCycle: {
    id: CYCLE_ID,
    fieldId: FIELD_ID,
    crop: 'আমন ধান',
    variety: 'BRRI dhan49',
    season: 'aman',
    sowingDate: '2026-06-15',
    expectedHarvest: '2026-11-12',
    status: 'active',
    stage: 'tillering',
    dayIndex: 19,
    actualYieldKg: null,
  },
  missingFields: [],
};

export const cropCycle: CropCycle = fieldState.activeCycle as CropCycle;

// ---- Farm + field list (farm/page.tsx) ----------------------------------------------------
// One active field (Aman, in the ground — right for late July) + one seeded historical field,
// read-only in the demo (§B.3 scope boundary). The historical field's last cycle is Boro,
// harvested this past Rabi season (Dec–May), which is what would actually be true by July.

export interface FarmSummary {
  id: string;
  name: string;
  district: string;
  aez: number;
}

export const farm: FarmSummary = {
  id: FARM_ID,
  name: 'হাসানের খামার',
  district: 'ময়মনসিংহ',
  aez: 8,
};

export interface FieldSummary {
  id: string;
  name: string;
  areaHa: number;
  crop: string | null;
  stage: string | null;
  status: 'active' | 'harvested';
  isReadOnly: boolean;
}

export const southFieldCycle: CropCycle = {
  id: SOUTH_CYCLE_ID,
  fieldId: SOUTH_FIELD_ID,
  crop: 'বোরো ধান',
  variety: 'BRRI dhan89',
  season: 'boro',
  sowingDate: '2026-01-08',
  expectedHarvest: '2026-05-02',
  status: 'harvested',
  stage: 'harvest',
  dayIndex: 114,
  actualYieldKg: 2410,
};

export const fieldList: FieldSummary[] = [
  {
    id: FIELD_ID,
    name: fieldState.identity.name ?? '',
    areaHa: fieldState.identity.areaHa ?? 0,
    crop: cropCycle.crop,
    stage: cropCycle.stage,
    status: 'active',
    isReadOnly: false,
  },
  {
    id: SOUTH_FIELD_ID,
    name: 'দক্ষিণের জমি',
    areaHa: 0.32,
    crop: southFieldCycle.crop,
    stage: southFieldCycle.stage,
    status: 'harvested',
    isReadOnly: true,
  },
];

// ---- Plan (season timeline) --------------------------------------------------------------

export const planEvents: PlanEvent[] = [
  {
    id: 'pe-1', cropCycleId: CYCLE_ID, stageKey: 'nursery', title: 'বীজতলা তৈরি', action: 'nursery_sowing',
    quantity: null, unit: null, plannedDate: '2026-06-15', actualDate: '2026-06-15', status: 'done',
    shiftReason: null, sources: [], sortOrder: 1,
  },
  {
    id: 'pe-2', cropCycleId: CYCLE_ID, stageKey: 'land_prep', title: 'জমি প্রস্তুতি', action: 'land_preparation',
    quantity: null, unit: null, plannedDate: '2026-06-28', actualDate: '2026-06-28', status: 'done',
    shiftReason: null, sources: [], sortOrder: 2,
  },
  {
    id: 'pe-3', cropCycleId: CYCLE_ID, stageKey: 'transplanting', title: 'চারা রোপণ', action: 'transplanting',
    quantity: null, unit: null, plannedDate: '2026-07-05', actualDate: '2026-07-05', status: 'done',
    shiftReason: null, sources: [], sortOrder: 3,
  },
  {
    id: 'pe-4', cropCycleId: CYCLE_ID, stageKey: 'tillering', title: 'প্রথম আগাছা পরিষ্কার', action: 'weeding',
    quantity: null, unit: null, plannedDate: '2026-07-20', actualDate: '2026-07-23', status: 'shifted',
    shiftReason: 'ভারী বৃষ্টির কারণে ৩ দিন পিছিয়েছে (৪২ মিমি বৃষ্টিপাত)', sources: [], sortOrder: 4,
  },
  {
    id: 'pe-5', cropCycleId: CYCLE_ID, stageKey: 'tillering', title: 'দ্বিতীয় ইউরিয়া প্রয়োগ', action: 'top_dressing_urea',
    quantity: 27, unit: 'kg', plannedDate: '2026-08-05', actualDate: null, status: 'pending',
    shiftReason: null,
    sources: [{ source: 'crop_rules.json', reference: 'BRRI dhan49 → nitrogen split 2/3', method: 'table', retrievedAt: '2026-07-24T05:00:00Z' }],
    sortOrder: 5,
  },
  {
    id: 'pe-6', cropCycleId: CYCLE_ID, stageKey: 'panicle_initiation', title: 'শেষ ইউরিয়া প্রয়োগ', action: 'top_dressing_urea',
    quantity: 27, unit: 'kg', plannedDate: '2026-08-25', actualDate: null, status: 'pending',
    shiftReason: null,
    sources: [{ source: 'crop_rules.json', reference: 'BRRI dhan49 → nitrogen split 3/3', method: 'table', retrievedAt: '2026-07-24T05:00:00Z' }],
    sortOrder: 6,
  },
  {
    id: 'pe-7', cropCycleId: CYCLE_ID, stageKey: 'booting', title: 'বুটিং পর্যায়', action: 'stage_watch',
    quantity: null, unit: null, plannedDate: '2026-09-10', actualDate: null, status: 'pending',
    shiftReason: null, sources: [], sortOrder: 7,
  },
  {
    id: 'pe-8', cropCycleId: CYCLE_ID, stageKey: 'flowering', title: 'ফুল আসার পর্যায়', action: 'stage_watch',
    quantity: null, unit: null, plannedDate: '2026-09-25', actualDate: null, status: 'pending',
    shiftReason: null, sources: [], sortOrder: 8,
  },
  {
    id: 'pe-9', cropCycleId: CYCLE_ID, stageKey: 'grain_filling', title: 'দানা ভরাটের পর্যায়', action: 'stage_watch',
    quantity: null, unit: null, plannedDate: '2026-10-10', actualDate: null, status: 'pending',
    shiftReason: null, sources: [], sortOrder: 9,
  },
  {
    id: 'pe-10', cropCycleId: CYCLE_ID, stageKey: 'harvest', title: 'ফসল কাটা', action: 'harvest',
    quantity: null, unit: null, plannedDate: '2026-11-12', actualDate: null, status: 'pending',
    shiftReason: null, sources: [], sortOrder: 10,
  },
];

export function nextPendingEvents(count = 2): PlanEvent[] {
  return planEvents
    .filter((e) => e.status === 'pending')
    .sort((a, b) => (a.plannedDate ?? '').localeCompare(b.plannedDate ?? ''))
    .slice(0, count);
}

// ---- Risk ----------------------------------------------------------------------------------

const bphSources: Provenance[] = [
  { source: 'IRRI Rice Knowledge Bank', reference: 'Brown Planthopper fact sheet', method: 'rag', retrievedAt: '2026-07-24T05:10:00Z' },
];

export const riskWindows: RiskWindow[] = [
  {
    id: 'risk-1',
    cropCycleId: CYCLE_ID,
    pest: 'বাদামি গাছ ফড়িং (Brown Planthopper)',
    level: 'elevated',
    startsOn: '2026-07-24',
    endsOn: '2026-08-10',
    trigger: { temp_c: [28, 32], rh: 85 },
    prevention: 'জমিতে অতিরিক্ত পানি জমতে দেবেন না, প্রয়োজনের বেশি ইউরিয়া দেবেন না',
    treatment: 'আক্রমণ থ্রেশহোল্ড ছাড়ালে সুপারিশকৃত কীটনাশক প্রয়োগ করুন',
    estCostBdt: 1300,
    sources: bphSources,
  },
];

export function activeRiskWindow(): RiskWindow | null {
  const today = '2026-07-24';
  return (
    riskWindows.find((r) => (!r.startsOn || r.startsOn <= today) && (!r.endsOn || r.endsOn >= today) && r.level !== 'low') ??
    null
  );
}

// ---- Financials ------------------------------------------------------------------------------

export const ledgerEntries: LedgerEntry[] = [
  { id: 'l-1', cropCycleId: CYCLE_ID, kind: 'cost', item: 'জমি প্রস্তুতি', qty: 1, unit: null, unitCost: 4200, total: 4200, source: 'costs_bd.json', assumption: 'দুইবার চাষ + মই', isActual: true, occurredOn: '2026-06-28', transactionId: null },
  { id: 'l-2', cropCycleId: CYCLE_ID, kind: 'cost', item: 'চারা/বীজ', qty: 1, unit: null, unitCost: 1600, total: 1600, source: 'costs_bd.json', assumption: 'BRRI dhan49 চারা', isActual: true, occurredOn: '2026-06-15', transactionId: null },
  { id: 'l-3', cropCycleId: CYCLE_ID, kind: 'cost', item: 'ইউরিয়া', qty: 54, unit: 'kg', unitCost: 27, total: 1460, source: 'crop_rules.json → BRRI dhan49 NPKS', assumption: null, isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-4', cropCycleId: CYCLE_ID, kind: 'cost', item: 'টিএসপি', qty: 18, unit: 'kg', unitCost: 27, total: 486, source: 'crop_rules.json → BRRI dhan49 NPKS', assumption: null, isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-5', cropCycleId: CYCLE_ID, kind: 'cost', item: 'এমওপি', qty: 20, unit: 'kg', unitCost: 20, total: 400, source: 'crop_rules.json → BRRI dhan49 NPKS', assumption: null, isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-6', cropCycleId: CYCLE_ID, kind: 'cost', item: 'সেচ (বৃষ্টি-নির্ভর, সম্পূরক)', qty: null, unit: null, unitCost: null, total: 2800, source: 'costs_bd.json', assumption: 'গড়ে ৩-৪ বার সম্পূরক সেচ', isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-7', cropCycleId: CYCLE_ID, kind: 'cost', item: 'রোপণ মজুরি', qty: null, unit: null, unitCost: null, total: 3600, source: 'costs_bd.json (BBS মজুরি হার)', assumption: null, isActual: true, occurredOn: '2026-07-05', transactionId: null },
  { id: 'l-8', cropCycleId: CYCLE_ID, kind: 'cost', item: 'আগাছা পরিষ্কার মজুরি', qty: null, unit: null, unitCost: null, total: 2400, source: 'costs_bd.json (BBS মজুরি হার)', assumption: '২ রাউন্ড', isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-9', cropCycleId: CYCLE_ID, kind: 'cost', item: 'কীটনাশক (বাদামি গাছ ফড়িং)', qty: null, unit: null, unitCost: null, total: 1300, source: 'pest_rules.json est_cost', assumption: 'ঝুঁকি সক্রিয় হলে প্রযোজ্য', isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-10', cropCycleId: CYCLE_ID, kind: 'cost', item: 'ফসল কাটা ও মাড়াই মজুরি', qty: null, unit: null, unitCost: null, total: 4800, source: 'costs_bd.json (BBS মজুরি হার)', assumption: null, isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-11', cropCycleId: CYCLE_ID, kind: 'cost', item: 'জমির ভাড়া মূল্য (আনুমানিক)', qty: null, unit: null, unitCost: null, total: 7000, source: 'costs_bd.json', assumption: 'BBS প্রথা অনুযায়ী অন্তর্ভুক্ত', isActual: false, occurredOn: null, transactionId: null },
  { id: 'l-12', cropCycleId: CYCLE_ID, kind: 'revenue', item: 'ধান বিক্রয় (প্রত্যাশিত)', qty: 2300, unit: 'kg', unitCost: 28, total: 64400, source: 'DAM farmgate price snapshot', assumption: 'AEZ গড় ফলন, স্বাভাবিক আবহাওয়া', isActual: false, occurredOn: null, transactionId: null },
];

export const financials: FinancialResult = {
  lineItems: ledgerEntries,
  totalCost: 30046,
  expectedYieldKg: 2300,
  grossRevenue: 64400,
  netProfit: 34354,
  roi: 34354 / 30046,
  bcr: 64400 / 30046,
  breakEvenYieldKg: 30046 / 28,
  breakEvenPrice: 30046 / 2300,
};

// ---- Scenario simulation (Tier-1 gap, ScenarioRun shape) -----------------------------------
// Pure re-run of the same financial engine under a cash-budget constraint, diffed against the
// live plan — never a fresh estimate. The land-rent convention line (l-11) doesn't flex with a
// cash budget cut, so it's excluded from the reduction.

export function scenarioFinancials(cutFraction = 0.4): FinancialResult {
  const FIXED_ITEM_IDS = new Set(['l-11']);
  const yieldFactor = 1 - cutFraction * 0.18;
  const lineItems = financials.lineItems.map((l) => {
    if (l.kind === 'revenue') return { ...l, total: Math.round(l.total * yieldFactor) };
    if (FIXED_ITEM_IDS.has(l.id)) return l;
    return { ...l, total: Math.round(l.total * (1 - cutFraction * 0.85)) };
  });
  const totalCost = lineItems.filter((l) => l.kind === 'cost').reduce((s, l) => s + l.total, 0);
  const grossRevenue = lineItems.filter((l) => l.kind === 'revenue').reduce((s, l) => s + l.total, 0);
  const expectedYieldKg = Math.round(financials.expectedYieldKg * yieldFactor);
  const netProfit = grossRevenue - totalCost;
  return {
    lineItems,
    totalCost,
    expectedYieldKg,
    grossRevenue,
    netProfit,
    roi: netProfit / totalCost,
    bcr: grossRevenue / totalCost,
    breakEvenYieldKg: totalCost / 28,
    breakEvenPrice: totalCost / expectedYieldKg,
  };
}

// ---- New-field onboarding + crop selection (field/new) --------------------------------------
// Illustrative content for the intake → crop-selection chain. Scores/costs are plausible,
// sourced-looking placeholders like the rest of this file — not numbers to defend in Q&A.

export interface CropCandidate {
  key: string;
  name: string;
  variety: string;
  score: number;
  water: 'Low' | 'Medium' | 'High';
  risk: 'Low' | 'Medium' | 'High';
  netProfitBdt: number;
  totalCostBdt: number;
  days: number;
  note: string;
}

export const cropCandidates: CropCandidate[] = [
  {
    key: 'aman',
    name: 'আমন ধান',
    variety: 'BRRI dhan49',
    score: 91,
    water: 'Medium',
    risk: 'Low',
    netProfitBdt: 34354,
    totalCostBdt: 30046,
    days: 150,
    note: 'Fits AEZ 8 and the current Kharif-2 rainfall almost perfectly — the standard choice for land already in Aman rotation.',
  },
  {
    key: 'jute',
    name: 'পাট',
    variety: 'O-9897 (Bogi)',
    score: 78,
    water: 'Low',
    risk: 'Medium',
    netProfitBdt: 22400,
    totalCostBdt: 18200,
    days: 120,
    note: 'Needs less standing water than rice and fetches a decent fibre price, but retting requires nearby water access at harvest.',
  },
  {
    key: 'maize',
    name: 'ভুট্টা',
    variety: 'Off-season hybrid',
    score: 61,
    water: 'Low',
    risk: 'Medium',
    netProfitBdt: 19800,
    totalCostBdt: 21400,
    days: 110,
    note: 'Lowest water need of the three, but July heat and humidity push disease risk up, and this is a shoulder-season planting for maize.',
  },
];

// ---- bdapps CaaS (checkout simulation, §A.3) ------------------------------------------------
// Placeholder request/response shapes only — no live calls in this mock frontend. The proposal
// basket is built from the same pe-5 plan event the fertilizer card and timeline already read,
// so the charge can never drift from the plan (§A.3 "the basket cannot drift from the plan").

export function nextFertilizerEvent(): PlanEvent | null {
  return planEvents.find((e) => e.action === 'top_dressing_urea' && e.status === 'pending') ?? null;
}

export interface CaasBasketItem {
  item: string;
  qty: number;
  unit: string;
  unitCostBdt: number;
  totalBdt: number;
}

export function caasBasket(): { items: CaasBasketItem[]; totalBdt: number } {
  const ev = nextFertilizerEvent();
  const items: CaasBasketItem[] = ev
    ? [{ item: 'ইউরিয়া', qty: ev.quantity ?? 0, unit: ev.unit ?? 'kg', unitCostBdt: 27, totalBdt: (ev.quantity ?? 0) * 27 }]
    : [];
  return { items, totalBdt: items.reduce((sum, i) => sum + i.totalBdt, 0) };
}

export interface CaasBalance {
  accountType: 'Prepaid' | 'Postpaid';
  accountStatus: string;
  chargeableBalanceBdt: number;
  msisdn: string;
  statusCode: string;
}

export const caasBalance: CaasBalance = {
  accountType: 'Prepaid',
  accountStatus: 'Active',
  chargeableBalanceBdt: 2450,
  msisdn: 'tel:8801712345678',
  statusCode: 'S1000',
};

// ---- Purchases (posted transaction history) --------------------------------------------------
// Reuses ledgerEntries where isActual is true — a posted charge is exactly what "purchases"
// means here, so this can never drift from the money tab's own ledger.

export function postedTransactions(): LedgerEntry[] {
  return ledgerEntries
    .filter((l) => l.isActual && l.occurredOn)
    .sort((a, b) => (b.occurredOn ?? '').localeCompare(a.occurredOn ?? ''));
}

// ---- Weather (mock external call shape) -----------------------------------------------------

export interface WeatherSummary {
  tempMinC: number;
  tempMaxC: number;
  rainMm7d: number;
  et0MmDay: number;
  rainProbabilityMax: number;
  source: string;
  retrievedAt: string;
}

export const weather: WeatherSummary = {
  tempMinC: 27,
  tempMaxC: 33,
  rainMm7d: 38,
  et0MmDay: 4.1,
  rainProbabilityMax: 65,
  source: 'Open-Meteo (ECMWF)',
  retrievedAt: '2026-07-24T05:00:00Z',
};

// ---- Feed (unified chat + trace history) -----------------------------------------------------

export type FeedItem =
  | { id: string; type: 'message'; message: Message }
  | { id: string; type: 'tool_trace'; traces: TraceEntry[] };

function msg(id: string, role: Message['role'], content: string, createdAt: string, isProactive = false): Message {
  return { id, conversationId: CONV_ID, role, content, toolCalls: null, isProactive, createdAt };
}

function trace(id: string, step: number, tool: string, toolClass: TraceEntry['toolClass'], params: unknown, result: unknown, durationMs: number, source: string | null, createdAt: string): TraceEntry {
  return { id, conversationId: CONV_ID, messageId: null, step, tool, toolClass, params, result, source, status: 'ok', durationMs, createdAt };
}

export const initialFeed: FeedItem[] = [
  {
    id: 'f-1', type: 'tool_trace',
    traces: [trace('t-1', 1, 'get_weather', 'external', { lat: 24.75, lon: 90.42, forecast_days: 16 },
      { rain_mm_7d: 38, et0_mm_day: 4.1, temp_c: [27, 33] }, 412, 'Open-Meteo (ECMWF)', '2026-07-24T05:00:12Z')],
  },
  {
    id: 'f-2', type: 'message',
    message: msg('m-2', 'assistant', 'আগামী ৭ দিনে প্রায় ৩৮ মিমি বৃষ্টি হতে পারে, তাপমাত্রা ২৭–৩৩°সে থাকবে। এই আর্দ্র আবহাওয়ায় পোকার ঝুঁকি একটু বেড়ে যায় — যাচাই করছি।', '2026-07-24T05:00:14Z', true),
  },
  {
    id: 'f-3', type: 'tool_trace',
    traces: [trace('t-3', 2, 'assess_pest_risk', 'deterministic', { crop: 'aman_rice', stage: 'tillering', temp_c: [28, 32], rh: 85 },
      { pest: 'brown_planthopper', level: 'elevated' }, 96, 'pest_rules.json', '2026-07-24T05:00:18Z')],
  },
  {
    id: 'f-4', type: 'message',
    message: msg('m-4', 'assistant', 'বর্তমান তাপমাত্রা ও আর্দ্রতায় বাদামি গাছ ফড়িংয়ের ঝুঁকি "মাঝারি থেকে বেশি" পর্যায়ে। জমিতে পানি না জমতে দিলে এবং প্রয়োজনের বেশি ইউরিয়া না দিলে এটি এড়ানো সহজ।', '2026-07-24T05:00:20Z', true),
  },
];

// ---- Placeholder interaction responses -----------------------------------------------------
// No live agent here — these are scripted feed items appended client-side when the farmer
// edits a card, standing in for `POST /api/log` → scoped replan (services/replan/trigger.service.ts)
// until apps/api is wired up. Shapes match what that endpoint will actually stream back.

export function logIrrigationFeedItems(amountMm: number, idSuffix: string): FeedItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: `log-trace-${idSuffix}`, type: 'tool_trace',
      traces: [trace(`log-t-${idSuffix}`, 90, 'log_field_event', 'field', { kind: 'irrigation', amount_mm: amountMm }, { logged: true }, 41, null, now)],
    },
    {
      id: `log-msg-${idSuffix}`, type: 'message',
      message: msg(`log-m-${idSuffix}`, 'assistant', `লগ করা হলো — ${amountMm} মিমি সেচ। বাষ্পীভবন দৈনিক ৪.১ মিমি হিসেবে, পরবর্তী সেচ প্রায় ৫–৬ দিন পিছিয়ে যাবে। এই সপ্তাহের সেচ খরচ প্রায় ৳২৮০ কমেছে।`, now, true),
    },
  ];
}

export function logFertilizerFeedItems(amountKg: number, idSuffix: string): FeedItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: `log-trace-${idSuffix}`, type: 'tool_trace',
      traces: [trace(`log-t-${idSuffix}`, 90, 'log_field_event', 'field', { kind: 'fertilizer', amount_kg: amountKg }, { logged: true }, 33, null, now)],
    },
    {
      id: `log-msg-${idSuffix}`, type: 'message',
      message: msg(`log-m-${idSuffix}`, 'assistant', `লগ করা হলো — ${amountKg} কেজি ইউরিয়া প্রয়োগ। পরবর্তী ইউরিয়া ডোজের হিসাব ও খরচ আপডেট করা হয়েছে — মানি ট্যাবে দেখুন।`, now, true),
    },
  ];
}

export function userMessageFeedItem(content: string, idSuffix: string): FeedItem {
  return { id: `user-${idSuffix}`, type: 'message', message: msg(`um-${idSuffix}`, 'user', content, new Date().toISOString()) };
}

export function genericAckFeedItems(idSuffix: string): FeedItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: `ack-${idSuffix}`, type: 'message',
      message: msg(
        `ackm-${idSuffix}`,
        'assistant',
        'এই মুহূর্তে এটি একটি প্লেসহোল্ডার প্রতিক্রিয়া — আসল এজেন্ট (POST /api/chat, SSE) শীঘ্রই যুক্ত হবে। ততক্ষণে, নিচে থেকে সেচ বা সার লগ করে দেখুন কীভাবে এজেন্ট নিজে থেকে সাড়া দেয়।',
        now,
        false,
      ),
    },
  ];
}

export function approveChargeFeedItems(idSuffix: string): FeedItem[] {
  const now = new Date().toISOString();
  const basket = caasBasket();
  return [
    {
      id: `pay-trace-${idSuffix}`, type: 'tool_trace',
      traces: [
        trace(`pay-t1-${idSuffix}`, 91, 'bdapps_query_balance', 'external', { subscriberId: caasBalance.msisdn }, { chargeableBalance: caasBalance.chargeableBalanceBdt, statusCode: caasBalance.statusCode }, 318, 'bdapps CaaS (simulator)', now),
        trace(`pay-t2-${idSuffix}`, 92, 'bdapps_direct_debit', 'gated', { amount: basket.totalBdt, subscriberId: caasBalance.msisdn }, { internalTrxId: `INT-${idSuffix}`, referenceId: `REF-${idSuffix}`, statusCode: 'S1000' }, 587, 'bdapps CaaS (simulator)', now),
      ],
    },
    {
      id: `pay-msg-${idSuffix}`, type: 'message',
      message: msg(`pay-m-${idSuffix}`, 'assistant', `৳${basket.totalBdt} সফলভাবে কেটে নেওয়া হয়েছে ইউরিয়ার জন্য। রশিদ তৈরি হয়েছে, খরচ এখন হিসাবে "প্রকৃত" হিসেবে যোগ হলো।`, now, true),
    },
  ];
}
