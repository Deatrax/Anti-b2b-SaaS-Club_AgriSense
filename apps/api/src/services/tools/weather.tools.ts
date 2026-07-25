// tools/weather.tools.ts — get_weather. Class: 'external'. The ONE required real call (§1.2 #2).
// Uses openmeteo.client; provenance.source = "Open-Meteo (ECMWF)".
//
// openmeteo.client's getForecast() already falls back to its on-disk cache internally —
// a stale-but-live-call-failed read returns successfully with `stale: true` rather than
// throwing. That path is surfaced here as a visible `assumptions` note (the §C.7 "⚠ Open-Meteo
// timed out — cached forecast from 09:14" line) rather than the registry's fallback status,
// since the handler never actually threw. The `fallback` below covers every throw instead
// (no live call AND no cache, or the location precondition failing) — see its own comment.
import { z } from 'zod';
import type { ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { getForecast, type Forecast } from '../external/openmeteo.client';
import { FieldModel } from '../../models/field.model';

const schema = z.object({});

type WeatherData = Forecast | null;

export function registerWeatherTools(): void {
  register({
    name: 'get_weather',
    description:
      "Live daily/hourly forecast for the field's location from Open-Meteo — rainfall, " +
      'temperature, ET₀, humidity, soil moisture. Call once per turn; the data covers 16 days.',
    schema,
    toolClass: 'external',
    phases: ['GENERAL', 'PLANNING', 'MAINTAINING'],
    timeoutMs: 8000,
    handler: async (_args, ctx): Promise<ToolResult<WeatherData>> => {
      let lat: number | null = null;
      let lon: number | null = null;
      if (ctx.fieldId) {
        const field = await FieldModel.getState(ctx.fieldId);
        lat = field.identity.lat ?? null;
        lon = field.identity.lon ?? null;
      } else {
        const { FarmModel } = await import('../../models/farm.model');
        const farm = await FarmModel.get(ctx.farmId);
        lat = farm?.lat ?? null;
        lon = farm?.lon ?? null;
      }
      
      if (lat == null || lon == null) {
        throw new Error('get_weather called before a location is known — resolve location first.');
      }
      const forecast = await getForecast(lat, lon);
      return {
        data: forecast,
        provenance: [{ source: 'Open-Meteo (ECMWF)', method: 'api', retrievedAt: forecast.cachedAt }],
        assumptions: forecast.stale
          ? [`⚠ Live Open-Meteo call failed — showing cached forecast from ${forecast.cachedAt}.`]
          : undefined,
      };
    },
    // Catches getForecast() throwing (no live call AND no cache) as well as the location
    // precondition failing. `fallback` only receives `args`, not the error (§C.7's registry
    // contract), so this message stays cause-agnostic rather than guessing which one happened —
    // the real cause is still in the trace row's `result.error` for debugging.
    fallback: (): ToolResult<WeatherData> => ({
      data: null,
      provenance: [{ source: 'Open-Meteo (ECMWF)', method: 'api', retrievedAt: new Date().toISOString() }],
      assumptions: ['⚠ Weather data is unavailable for this request — proceeding without weather grounding.'],
    }),
  });
}
