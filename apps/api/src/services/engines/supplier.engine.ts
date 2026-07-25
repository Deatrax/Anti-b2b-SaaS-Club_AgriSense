// engines/supplier.engine.ts — PURE (mirrors ranking.engine.ts §C.9 philosophy: a transparent,
// arguable model beats an opaque one). Transparent weighted score over price, delivery time,
// distance, rating. Unlike crop fit's absolute ECOCROP min/opt/max ranges, there is no
// absolute "ideal price" for a supplier offer — price/delivery/distance are min-max
// normalized RELATIVE TO THE CANDIDATE SET (cheapest/fastest/nearest → 1.0, worst → 0.0);
// rating normalizes against the fixed 1–5 catalog scale, which is absolute.
export const SUPPLIER_WEIGHTS = {
  price: 0.4,
  delivery: 0.25,
  distance: 0.2,
  rating: 0.15,
} as const;

export interface SupplierCandidate {
  supplierId: string;
  name: string;
  district: string;
  priceBdtPerKg: number;
  deliveryDays: number;
  distanceKm: number;
  /** 1–5 catalog rating. */
  rating: number;
}

export interface SupplierSubScores {
  price: number;
  delivery: number;
  distance: number;
  rating: number;
}

export interface SupplierScore extends SupplierCandidate {
  score: number;
  subScores: SupplierSubScores;
}

export interface RankSuppliersResult {
  ranked: SupplierScore[];
  weights: typeof SUPPLIER_WEIGHTS;
}

/** 1.0 for the lowest value in the set, 0.0 for the highest. An all-tied (incl.
 * single-candidate) set scores 1.0 — there is no worse alternative to be relatively behind. */
function lowerIsBetter(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return (max - value) / (max - min);
}

export function rankSuppliers(candidates: SupplierCandidate[]): RankSuppliersResult {
  if (candidates.length === 0) {
    return { ranked: [], weights: SUPPLIER_WEIGHTS };
  }

  const prices = candidates.map((c) => c.priceBdtPerKg);
  const deliveries = candidates.map((c) => c.deliveryDays);
  const distances = candidates.map((c) => c.distanceKm);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const deliveryMin = Math.min(...deliveries);
  const deliveryMax = Math.max(...deliveries);
  const distanceMin = Math.min(...distances);
  const distanceMax = Math.max(...distances);

  const ranked = candidates
    .map((c) => {
      const subScores: SupplierSubScores = {
        price: lowerIsBetter(c.priceBdtPerKg, priceMin, priceMax),
        delivery: lowerIsBetter(c.deliveryDays, deliveryMin, deliveryMax),
        distance: lowerIsBetter(c.distanceKm, distanceMin, distanceMax),
        rating: Math.max(0, Math.min(1, c.rating / 5)),
      };
      const score =
        SUPPLIER_WEIGHTS.price * subScores.price +
        SUPPLIER_WEIGHTS.delivery * subScores.delivery +
        SUPPLIER_WEIGHTS.distance * subScores.distance +
        SUPPLIER_WEIGHTS.rating * subScores.rating;
      return { ...c, score, subScores };
    })
    .sort((a, b) => b.score - a.score);

  return { ranked, weights: SUPPLIER_WEIGHTS };
}

/** Great-circle distance in km between two lat/lon points (haversine, R=6371km). Used to
 * distance-rank suppliers from the field's own lat/lon against each supplier's district
 * centroid (data/districts.json) — no per-supplier geocoding needed. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
