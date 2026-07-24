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
const updateFieldSchema = z.object({
  area_ha: z.number().positive().optional(),
  soil_type: z.enum(SOIL_TYPES).optional(),
  water_source: z.enum(WATER_SOURCES).optional(),
  budget_bdt: z.number().positive().optional(),
  target_season: z.enum(SEASONS).optional(),
  district: z.string().optional().describe("District name to resolve into the field's location."),
  lat: z.number().optional().describe('Use with lon for an exact location instead of district.'),
  lon: z.number().optional(),
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
      'Patches one or more intake fields on the field record (area, soil type, water source, budget, ' +
      'target season, location) and returns the updated record plus what is still missing.',
    schema: updateFieldSchema,
    toolClass: 'field',
    phases: ['GATHERING', 'MAINTAINING'],
    handler: async (args, ctx): Promise<ToolResult<FieldState>> => {
      const { district, target_season, lat, lon, ...rest } = args;
      if ((lat == null) !== (lon == null)) {
        throw new Error('lat and lon must be provided together');
      }

      const patch: Partial<{
        area_ha: number;
        soil_type: string;
        water_source: string;
        budget_bdt: number;
        lat: number;
        lon: number;
      }> = { ...rest };

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
