// lib/weather.ts — pulls the most recent real get_weather tool result out of the live chat
// feed. No standalone weather REST endpoint exists (§C.1) — weather only ever enters the
// frontend via a get_weather tool call streamed through chat, so this is genuinely the only
// honest source for it (never a placeholder number).
import type { FeedItem } from './feed';

export interface ForecastSummary {
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    et0_fao_evapotranspiration: number[];
    precipitation_probability_max: number[];
  };
  cachedAt: string;
  stale: boolean;
}

function isForecastSummary(v: unknown): v is ForecastSummary {
  return !!v && typeof v === 'object' && 'daily' in v && 'cachedAt' in v;
}

export function latestWeather(feed: FeedItem[]): ForecastSummary | null {
  for (let i = feed.length - 1; i >= 0; i--) {
    const item = feed[i];
    if (!item || item.type !== 'tool_trace') continue;
    for (const tr of item.traces) {
      if (tr.tool !== 'get_weather' || !tr.result || typeof tr.result !== 'object') continue;
      const data = (tr.result as { data?: unknown }).data;
      if (isForecastSummary(data)) return data;
    }
  }
  return null;
}
