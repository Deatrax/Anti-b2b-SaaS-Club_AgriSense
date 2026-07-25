// tools/marketplace.tools.ts — match_suppliers. Class: 'deterministic' (reads the seeded
// catalog + computes a ranking, same class as compute_financials/rank_crops). Reads real
// plan needs (via LedgerModel, same fertilizer-carrier filter payment.controller.ts's
// proposeBasket already uses) against the seeded data/suppliers.json catalog.
//
// selectSupplierForField() is exported (not registered as a tool) — confirming a supplier
// is a REST-only UI action from an explicit chip/button, same pattern as the checkout
// approval gate: never inferred from chat.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { LedgerEntry, ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { LedgerModel } from '../../models/ledger.model';
import { SupplierSelectionModel, type SupplierSelectionRow } from '../../models/supplierSelection.model';
import { rankSuppliers, haversineKm, type SupplierCandidate, type SupplierSubScores } from '../engines/supplier.engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../../../../data');

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(dataDir, file), 'utf-8')) as T;
}

interface SupplierCatalogEntry {
  id: string;
  name: string;
  district: string;
  rating: number;
  items: Record<string, { price_bdt_per_kg: number; delivery_days: number; in_stock: boolean }>;
}
interface SuppliersFile {
  suppliers: SupplierCatalogEntry[];
}
interface DistrictsFile {
  districts: Array<{ name: string; lat: number; lon: number }>;
}

const FERTILIZER_CARRIERS = ['urea', 'tsp', 'mop', 'gypsum'];

interface ItemNeed {
  /** 'urea'|'tsp'|'mop'|'gypsum'|'seed' — also the supplier_selections.item_key. */
  itemKey: string;
  /** Catalog lookup key: same as itemKey for fertilizer, `seed_${crop}` for seed. */
  catalogKey: string;
  neededQty: number;
  unit: string;
}

/** Groups the active cycle's still-projected (non-actual) cost lines by fertilizer carrier
 * or seed — the same set payment.controller.ts's proposeBasket already checks out. */
function deriveNeeds(ledgerLines: LedgerEntry[], crop: string): ItemNeed[] {
  const byItemKey = new Map<string, { qty: number; unit: string }>();
  for (const line of ledgerLines) {
    if (line.isActual || line.kind !== 'cost' || line.qty == null || !line.unit) continue;
    // Matches financial.tools.ts's exact `${carrier} (for ${nutrient})` item naming — any
    // future cost line starting with a carrier name (e.g. a new "urea..." line elsewhere)
    // would false-match here; keep this in sync if that naming ever changes.
    const carrier = FERTILIZER_CARRIERS.find((c) => line.item.startsWith(c));
    const itemKey = carrier ?? (line.item === 'seed' ? 'seed' : null);
    if (!itemKey) continue;
    const existing = byItemKey.get(itemKey) ?? { qty: 0, unit: line.unit };
    byItemKey.set(itemKey, { qty: existing.qty + line.qty, unit: line.unit });
  }
  return Array.from(byItemKey.entries()).map(([itemKey, { qty, unit }]) => ({
    itemKey,
    catalogKey: itemKey === 'seed' ? `seed_${crop}` : itemKey,
    neededQty: Number(qty.toFixed(2)),
    unit,
  }));
}

export interface SupplierOfferResult {
  supplierId: string;
  name: string;
  district: string;
  distanceKm: number;
  priceBdtPerKg: number;
  deliveryDays: number;
  rating: number;
  score: number;
  subScores: SupplierSubScores;
}

export interface ItemMatch {
  itemKey: string;
  neededQty: number;
  unit: string;
  offers: SupplierOfferResult[];
  /** The farmer's currently-confirmed supplier for this item (supplier_selections), or null
   * if none chosen yet — lets the UI show "Selected" on reload, not just right after a POST. */
  selectedSupplierId: string | null;
}

export interface MarketplaceMatchResult {
  items: ItemMatch[];
}

/** Ranked suppliers for every still-needed plan input (or just `itemKey` if given). Empty
 * `items` (not a throw) when there's nothing left to buy — mirrors proposeBasket's own
 * "no pending fertilizer costs" non-error case. Throws only on a real precondition gap
 * (no field location) the farmer must resolve first, same convention as compute_financials. */
export async function matchSuppliersForField(fieldId: string, itemKey?: string): Promise<MarketplaceMatchResult> {
  const field = await FieldModel.getState(fieldId);
  const cycle = field.activeCycle;
  if (!cycle || !cycle.crop) {
    return { items: [] };
  }
  if (field.identity.lat == null || field.identity.lon == null) {
    throw new Error('field has no location set — resolve location before matching suppliers.');
  }

  const ledgerLines = await LedgerModel.listByCycle(cycle.id);
  let needs = deriveNeeds(ledgerLines, cycle.crop);
  if (itemKey) needs = needs.filter((n) => n.itemKey === itemKey);
  if (needs.length === 0) return { items: [] };

  const selections = await SupplierSelectionModel.listByCycle(cycle.id);
  const selectedSupplierByItem = new Map(selections.map((s) => [s.item_key, s.supplier_id]));

  const suppliersFile = loadJson<SuppliersFile>('suppliers.json');
  const districtsFile = loadJson<DistrictsFile>('districts.json');
  const districtByName = new Map(districtsFile.districts.map((d) => [d.name, d]));

  const items: ItemMatch[] = needs.map((need) => {
    const candidates: SupplierCandidate[] = [];
    for (const supplier of suppliersFile.suppliers) {
      const offer = supplier.items[need.catalogKey];
      if (!offer || !offer.in_stock) continue;
      const d = districtByName.get(supplier.district);
      if (!d) {
        throw new Error(`unknown district "${supplier.district}" on supplier "${supplier.id}" — not in data/districts.json.`);
      }
      const distanceKm = Number(haversineKm(field.identity.lat!, field.identity.lon!, d.lat, d.lon).toFixed(1));
      candidates.push({
        supplierId: supplier.id,
        name: supplier.name,
        district: supplier.district,
        priceBdtPerKg: offer.price_bdt_per_kg,
        deliveryDays: offer.delivery_days,
        distanceKm,
        rating: supplier.rating,
      });
    }
    const { ranked } = rankSuppliers(candidates);
    const offers: SupplierOfferResult[] = ranked.map((r) => ({
      supplierId: r.supplierId,
      name: r.name,
      district: r.district,
      distanceKm: r.distanceKm,
      priceBdtPerKg: r.priceBdtPerKg,
      deliveryDays: r.deliveryDays,
      rating: r.rating,
      score: Number(r.score.toFixed(4)),
      subScores: r.subScores,
    }));
    return {
      itemKey: need.itemKey,
      neededQty: need.neededQty,
      unit: need.unit,
      offers,
      selectedSupplierId: selectedSupplierByItem.get(need.itemKey) ?? null,
    };
  });

  return { items };
}

/** Persists the farmer's supplier choice for one plan item. Called only from the REST
 * selection endpoint (marketplace.controller.ts), never as an agent tool — see file header. */
export async function selectSupplierForField(
  fieldId: string,
  itemKey: string,
  supplierId: string,
): Promise<{ selection: SupplierSelectionRow }> {
  const field = await FieldModel.getState(fieldId);
  const cycle = field.activeCycle;
  if (!cycle || !cycle.crop) {
    throw new Error('no active crop cycle with a chosen crop — nothing to select a supplier for yet.');
  }

  const suppliersFile = loadJson<SuppliersFile>('suppliers.json');
  const supplier = suppliersFile.suppliers.find((s) => s.id === supplierId);
  if (!supplier) {
    throw new Error(`unknown supplier "${supplierId}" — not in data/suppliers.json.`);
  }

  const catalogKey = itemKey === 'seed' ? `seed_${cycle.crop}` : itemKey;
  const offer = supplier.items[catalogKey];
  if (!offer || !offer.in_stock) {
    throw new Error(`"${supplier.name}" does not currently stock "${catalogKey}".`);
  }

  const selection = await SupplierSelectionModel.upsert(cycle.id, itemKey, {
    supplierId: supplier.id,
    supplierName: supplier.name,
    unitPriceBdt: offer.price_bdt_per_kg,
    deliveryDays: offer.delivery_days,
  });
  return { selection };
}

const matchSuppliersSchema = z.object({
  itemKey: z
    .string()
    .nullable()
    .optional()
    .describe("Limit to one item: 'urea'|'tsp'|'mop'|'gypsum'|'seed'. Omit or null to match every still-needed input."),
});

export function registerMarketplaceTools(): void {
  register({
    name: 'match_suppliers',
    description:
      "Ranks the field's still-needed fertilizer and seed inputs (from the season plan's cost lines) against a " +
      'seeded/mock supplier catalog by price, delivery time, distance, and rating. Use after a season plan exists ' +
      'and the farmer wants to know where to buy inputs.',
    schema: matchSuppliersSchema,
    toolClass: 'deterministic',
    phases: ['PLANNING', 'MAINTAINING'],
    handler: async (args, ctx): Promise<ToolResult<MarketplaceMatchResult>> => {
      const result = await matchSuppliersForField(ctx.fieldId, args.itemKey ?? undefined);
      const now = new Date().toISOString();
      return {
        data: result,
        provenance: [
          { source: 'data/suppliers.json', method: 'table', retrievedAt: now },
          { source: 'data/districts.json', method: 'table', retrievedAt: now },
          { source: 'supplier.engine.ts (rankSuppliers)', method: 'computed', retrievedAt: now },
        ],
      };
    },
  });
}
