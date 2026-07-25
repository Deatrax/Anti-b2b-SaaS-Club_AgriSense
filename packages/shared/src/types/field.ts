// Field identity + crop cycle + gap detection (§B.3 entity model, §1.2 #1 intake).

export type SoilType =
  | 'sandy' | 'sandy_loam' | 'loam' | 'silt_loam' | 'clay_loam' | 'clay';

export type WaterSource =
  | 'rainfed' | 'shallow_tubewell' | 'deep_tubewell' | 'canal' | 'pond' | 'river';

export type Season = 'boro' | 'aus' | 'aman' | 'rabi' | 'kharif_1' | 'kharif_2';

/** The six Tier-0 intake fields (§1.2 #1). Empty slots ARE the missing information. */
export const REQUIRED_INTAKE_FIELDS = [
  'name',
  'location',
  'area_ha',
  'soil_type',
  'water_source',
  'budget_bdt',
  'target_season',
] as const;
export type IntakeField = (typeof REQUIRED_INTAKE_FIELDS)[number];

export interface FieldIdentity {
  id: string;
  farmId: string;
  name: string | null;
  areaHa: number | null;
  soilType: SoilType | null;
  waterSource: WaterSource | null;
  lat: number | null;
  lon: number | null;
  budgetBdt: number | null;
}

export interface CropCycle {
  id: string;
  fieldId: string;
  crop: string | null;
  variety: string | null;
  season: Season | null;
  sowingDate: string | null;
  expectedHarvest: string | null;
  status: 'planned' | 'active' | 'harvested';
  stage: string | null;
  dayIndex: number | null;
  actualYieldKg: number | null;
}

/** getState() shape (field.model.ts): identity + active cycle + what is still missing. */
export interface FieldState {
  identity: FieldIdentity;
  activeCycle: CropCycle | null;
  /** The chosen season, whether it lives on an 'active' cycle or a 'planned' one created
   * during intake before a crop is picked — so consumers can show it even during GATHERING,
   * when activeCycle is still null. */
  targetSeason: Season | null;
  missingFields: IntakeField[];
}
