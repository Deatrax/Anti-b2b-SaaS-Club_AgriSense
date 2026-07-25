// tools/field.tools.ts — get_field_state, update_field, log_field_event, get_crop_history.
// Class: 'field'. Available across GATHERING/MAINTAINING (§C.7 tool table).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { FieldState, Provenance, ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { CropCycleModel } from '../../models/cropCycle.model';
import { FieldLogModel, type FieldLogRow } from '../../models/fieldLog.model';

// Same lookup data farm.model.ts uses for farm-level geocoding (§C.5). Duplicated rather than
// imported because farm.model.ts's lookupDistrict() is private and models/ is Mahim's file —
// the tool layer resolves its own "location" intake slot from the same source of truth.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const districtsPath = path.resolve(__dirname, '../../../../../data/districts.json');
interface DistrictEntry {
  name: string;
  name_bn: string;
  lat: number;
  lon: number;
  aez: number;
  aez_name: string;
}
const DISTRICTS: DistrictEntry[] = JSON.parse(readFileSync(districtsPath, 'utf-8')).districts;

function lookupDistrict(name: string): DistrictEntry | null {
  return DISTRICTS.find((d) => d.name.toLowerCase() === name.trim().toLowerCase()) ?? null;
}

const now = () => new Date().toISOString();

const getFieldStateSchema = z.object({});

const SOIL_TYPES = ['sandy', 'sandy_loam', 'loam', 'silt_loam', 'clay_loam', 'clay'] as const;
const WATER_SOURCES = ['rainfed', 'shallow_tubewell', 'deep_tubewell', 'canal', 'pond', 'river'] as const;
const SEASONS = ['boro', 'aus', 'aman', 'rabi', 'kharif_1', 'kharif_2'] as const;

// Mirrors packages/shared/src/types/field.ts's SoilType/WaterSource/Season unions — zod needs
// the literal list at runtime, so keep these in sync if that file's unions ever change.
// Every arg is NULLABLE with "null = the farmer didn't state it": OpenAI's strict tool mode
// makes every schema key required, so a plain-optional schema forces the model to fill ALL
// of them — which is exactly how gpt-4o was padding calls with invented soil/budget/season
// values. Giving it a legal null to emit is the deterministic fix; the handler strips nulls.
const ONLY_IF_STATED = 'ONLY if the farmer explicitly stated it in the conversation; null otherwise — NEVER guess.';
const updateFieldSchema = z.object({
  area_ha: z.number().positive().nullable().optional().describe(`Field area in hectares, ${ONLY_IF_STATED}`),
  soil_type: z.enum(SOIL_TYPES).nullable().optional().describe(`Soil type, ${ONLY_IF_STATED}`),
  water_source: z.enum(WATER_SOURCES).nullable().optional().describe(`Water source, ${ONLY_IF_STATED}`),
  budget_bdt: z.number().positive().nullable().optional().describe(`Season budget in BDT, ${ONLY_IF_STATED}`),
  target_season: z.enum(SEASONS).nullable().optional().describe(`Target season, ${ONLY_IF_STATED}`),
  district: z.string().nullable().optional().describe("District name to resolve into the field's location, ONLY if the farmer named it; null otherwise."),
  lat: z.number().nullable().optional().describe('Exact latitude the farmer gave — use with lon instead of district. null unless the farmer gave coordinates.'),
  lon: z.number().nullable().optional(),
  name: z.string().nullable().optional().describe(`The name of the field, ${ONLY_IF_STATED}`),
});

const logFieldEventSchema = z.object({
  kind: z.enum(['irrigation', 'fertilizer', 'pest', 'observation']),
  description: z.string().min(1),
  quantity: z.number().optional(),
  unit: z.string().optional(),
});

const getCropHistorySchema = z.object({});

export function registerFieldTools(): void {
  register({
    name: 'get_field_state',
    description: "The field's identity, active crop cycle, and which of the six intake fields are still missing.",
    schema: getFieldStateSchema,
    toolClass: 'field',
    phases: ['GATHERING', 'PLANNING', 'MAINTAINING', 'TRANSACTING'],
    handler: async (_args, ctx): Promise<ToolResult<FieldState>> => {
      const state = await FieldModel.getState(ctx.fieldId);
      return { data: state, provenance: [{ source: 'AgriSense field record', method: 'table', retrievedAt: now() }] };
    },
  });

  register({
    name: 'update_field',
    description:
      'Patches one or more intake fields on the field record (name, area, soil type, water source, budget, ' +
      'target season, location) and returns the updated record plus what is still missing. ' +
      'CRITICAL: include ONLY the keys the farmer explicitly stated — every omitted key stays unknown ' +
      'and gets asked about later, which is correct. Example: farmer says "Gazipur, about 1.2 acres" → ' +
      'call {"district":"Gazipur","area_ha":0.4856} with NO other keys. Inventing a soil type, budget, ' +
      'water source, or season the farmer never said corrupts the farm record.',
    schema: updateFieldSchema,
    toolClass: 'field',
    phases: ['GATHERING', 'MAINTAINING'],
    handler: async (args, ctx): Promise<ToolResult<FieldState>> => {
      let { lat, lon } = args;
      const { district, target_season, lat: _lat, lon: _lon, ...rest } = args;
      if ((lat == null) !== (lon == null)) {
        throw new Error('lat and lon must be provided together');
      }
      // Models sometimes pad the call with lat:0, lon:0 — a point in the Atlantic, never a
      // Bangladesh field. Treat it as absent so a real district lookup isn't clobbered.
      if (lat === 0 && lon === 0) {
        lat = undefined;
        lon = undefined;
      }

      // null means "the farmer didn't state it" (see schema note) — never write it.
      const patch: Partial<{
        name: string;
        area_ha: number;
        soil_type: string;
        water_source: string;
        budget_bdt: number;
        lat: number;
        lon: number;
      }> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null));

      const provenance: Provenance[] = [{ source: 'AgriSense field record', method: 'table', retrievedAt: now() }];

      if (lat != null && lon != null) {
        patch.lat = lat;
        patch.lon = lon;
      } else if (district) {
        const resolved = lookupDistrict(district);
        if (!resolved) {
          const known = DISTRICTS.map((d) => d.name).join(', ');
          throw new Error(`unknown district "${district}" — not in data/districts.json (have: ${known})`);
        }
        patch.lat = resolved.lat;
        patch.lon = resolved.lon;
        provenance.push({ source: 'data/districts.json', method: 'table', retrievedAt: now() });
      }

      if (Object.keys(patch).length > 0) {
        await FieldModel.update(ctx.fieldId, patch);
      }
      // fields has no target_season column — it's derived from a 'planned' crop_cycle's
      // season, so a season-only patch routes to CropCycleModel.create(), not FieldModel.update().
      if (target_season) {
        await CropCycleModel.create(ctx.fieldId, { season: target_season });
      }

      const state = await FieldModel.getState(ctx.fieldId);
      return { data: state, provenance };
    },
  });

  register({
    name: 'log_field_event',
    description: 'Records a farmer-reported field event: irrigation, fertilizer application, pest sighting, or a general observation.',
    schema: logFieldEventSchema,
    toolClass: 'field',
    phases: ['MAINTAINING'],
    handler: async (args, ctx): Promise<ToolResult<{ log: FieldLogRow; replanRecommended: boolean }>> => {
      const state = await FieldModel.getState(ctx.fieldId);
      const log = await FieldLogModel.add(
        ctx.fieldId,
        args.kind,
        { description: args.description, quantity: args.quantity, unit: args.unit },
        state.activeCycle?.id,
      );
      return {
        data: { log, replanRecommended: args.kind !== 'observation' },
        provenance: [{ source: 'Farmer-reported field log', method: 'memory', retrievedAt: now() }],
      };
    },
  });

  register({
    name: 'get_crop_history',
    description: "This field's past (harvested) crop cycles — what was grown before and how many seasons in a row.",
    schema: getCropHistorySchema,
    toolClass: 'field',
    phases: ['PLANNING'],
    // Deliberately does NOT consult data/rotation.json: it's still a TEMPLATE pending
    // agronomic verification (see its _meta.status). Applying rotation modifiers to a
    // candidate crop is ranking.engine.ts's job (Phase 4) once that data is trustworthy;
    // this tool only reports the raw, real history and a plain same-crop streak.
    handler: async (_args, ctx) => {
      const pastCycles = await CropCycleModel.history(ctx.fieldId);
      const lastCrop = pastCycles[0]?.crop ?? null;
      const lastSeason = pastCycles[0]?.season ?? null;
      let sameCropStreak = 0;
      for (const cycle of pastCycles) {
        if (lastCrop != null && cycle.crop === lastCrop) sameCropStreak++;
        else break;
      }
      return {
        data: { pastCycles, lastCrop, lastSeason, sameCropStreak },
        provenance: [{ source: 'AgriSense crop-cycle history', method: 'table', retrievedAt: now() }],
      };
    },
  });
}
