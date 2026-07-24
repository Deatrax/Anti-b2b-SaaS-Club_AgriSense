// weather.tools.test.ts — Phase 2: get_weather. openmeteo.client and FieldModel are mocked;
// this verifies the tool's own logic (location precondition, stale-forecast surfacing, and
// the true-last-resort fallback), not Open-Meteo or the DB.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const getForecast = vi.fn();
const traceFallback = vi.fn(async (_h: unknown, _result: unknown, _err: unknown, _durationMs: number) => undefined);

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));
vi.mock('../src/services/external/openmeteo.client', () => ({ getForecast }));
vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: traceFallback,
  },
}));

const { registerWeatherTools } = await import('../src/services/tools/weather.tools');
const { getRegistry } = await import('../src/services/tools/registry');

registerWeatherTools();

function makeCtx(): ToolCtx {
  return {
    conversationId: `conv-${Math.random()}`,
    messageId: null,
    fieldId: 'field-1',
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

const forecast = {
  latitude: 24.7471,
  longitude: 90.4203,
  daily: { time: ['2026-07-25'], precipitation_sum: [12], temperature_2m_max: [32], temperature_2m_min: [26], et0_fao_evapotranspiration: [4], precipitation_probability_max: [80] },
  hourly: { time: ['2026-07-25T00:00'], relative_humidity_2m: [88], soil_moisture_0_to_7cm: [0.3], soil_temperature_0cm: [27] },
  cachedAt: '2026-07-25T09:14:00.000Z',
  stale: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  getState.mockResolvedValue({ identity: { lat: 24.7471, lon: 90.4203 } });
});

async function call(args: unknown = {}) {
  return getRegistry().get('get_weather')!.handler(args, makeCtx());
}

describe('get_weather', () => {
  it('returns the raw forecast with Open-Meteo provenance and no assumptions when fresh', async () => {
    getForecast.mockResolvedValue(forecast);
    const out = await call();

    expect(out.data).toBe(forecast);
    expect(out.provenance[0]).toMatchObject({ source: 'Open-Meteo (ECMWF)', method: 'api', retrievedAt: forecast.cachedAt });
    expect(out.assumptions).toBeUndefined();
    expect(getForecast).toHaveBeenCalledWith(24.7471, 90.4203);
  });

  it('surfaces a stale cache read as a visible assumption instead of failing', async () => {
    getForecast.mockResolvedValue({ ...forecast, stale: true });
    const out = await call();

    expect(out.assumptions?.[0]).toMatch(/cached forecast from/);
  });

  it('degrades gracefully (does not throw to the caller) when the field has no location yet, ' +
    'while the real cause still lands in the trace record for debugging', async () => {
    getState.mockResolvedValue({ identity: { lat: null, lon: null } });
    const out = await call();

    expect(out.data).toBeNull();
    expect(out.assumptions?.[0]).toMatch(/unavailable/);
    expect(out.assumptions?.[0]).not.toMatch(/location/); // user-facing message stays generic
    const [, , recordedErr] = traceFallback.mock.calls[0]!;
    expect(String(recordedErr)).toMatch(/location/); // but the internal trace row keeps the real cause
  });

  it('falls back to a clearly-flagged null result when Open-Meteo has no live call and no cache', async () => {
    getForecast.mockRejectedValue(new Error('ENOTFOUND api.open-meteo.com'));
    const out = await call();

    expect(out.data).toBeNull();
    expect(out.assumptions?.[0]).toMatch(/unavailable/);
  });
});
