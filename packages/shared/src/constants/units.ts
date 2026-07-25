// Canonical units. BD farmers speak in bigha/acre; store canonical hectares and convert
// at the edges. Every conversion factor here is a DOCUMENTED assumption (rendered in trace).

export const CURRENCY = 'BDT';
export const AREA_UNIT = 'ha';

export const ACRE_TO_HA = 0.404686;
/** Standard bigha ≈ 0.1338 ha (regionally variable — surfaced as an assumption). */
export const BIGHA_TO_HA = 0.1338;

export const KG = 'kg';
