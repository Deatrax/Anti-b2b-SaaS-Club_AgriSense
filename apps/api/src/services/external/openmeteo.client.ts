// external/openmeteo.client.ts — keyless forecast (§C.5). One call gets daily precip/tmin/tmax/ET0
// + hourly RH + soil moisture. Wrapped as get_weather; includes a disk-cache fallback (§C.11).
import { env } from '../../config/env';

export interface Forecast {
  // TODO: daily precip_sum/tmax/tmin/et0/precip_prob; hourly rh/soil_moisture/soil_temp.
  [k: string]: unknown;
}

export async function getForecast(_lat: number, _lon: number, _days = 16): Promise<Forecast> {
  // TODO: GET `${env.OPEN_METEO_BASE_URL}/forecast?...&timezone=Asia/Dhaka`; parse to Forecast.
  //       On failure serve the last cached snapshot WITH a visible timestamp (fallback state, §C.7).
  void env;
  throw new Error('getForecast not implemented');
}
