// external/openmeteo.client.ts — keyless forecast (§C.5). One call gets daily precip/tmin/tmax/ET0
// + hourly RH + soil moisture. Wrapped as get_weather; includes a disk-cache fallback (§C.11).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env';

export interface Forecast {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    et0_fao_evapotranspiration: number[];
    precipitation_probability_max: number[];
  };
  hourly: {
    time: string[];
    relative_humidity_2m: number[];
    soil_moisture_0_to_7cm: number[];
    soil_temperature_0cm: number[];
  };
  /** When this snapshot was actually fetched — shown in the trace so a cached fallback is visible,
   * never a silent one (§C.7's "⚠ Open-Meteo timed out — cached forecast from 09:14"). */
  cachedAt: string;
  stale: boolean;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../../../../.cache');

function cacheFile(lat: number, lon: number): string {
  return path.join(CACHE_DIR, `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}.json`);
}

export async function getForecast(lat: number, lon: number, days = 16): Promise<Forecast> {
  const file = cacheFile(lat, lon);
  const url =
    `${env.OPEN_METEO_BASE_URL}/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration,precipitation_probability_max` +
    `&hourly=relative_humidity_2m,soil_moisture_0_to_7cm,soil_temperature_0cm` +
    `&forecast_days=${days}&timezone=Asia%2FDhaka`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as Omit<Forecast, 'cachedAt' | 'stale'>;
    const forecast: Forecast = { ...data, cachedAt: new Date().toISOString(), stale: false };
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, JSON.stringify(forecast), 'utf-8');
    return forecast;
  } catch (err) {
    try {
      const cached = JSON.parse(await readFile(file, 'utf-8')) as Forecast;
      return { ...cached, stale: true };
    } catch {
      throw err; // no cache to fall back to — the caller's fallback/error trace state takes over
    }
  }
}
