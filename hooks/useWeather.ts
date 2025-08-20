// hooks/useWeather.ts
import { useMemo } from "react";

export type WeatherUi = {
  /** Short code or URL for an icon (if you add later). */
  icon?: string | null;
  /** Human label like "Sunny", "Light rain". */
  label?: string | null;
  /** Optional temperature in °F (if you add later). */
  tempF?: number | null;
};

/** Reuse a single empty array so TS sees a stable WeatherUi[] type. */
const EMPTY_WEATHER: WeatherUi[] = [];

export function useWeather(enabled: boolean): WeatherUi[] {
  return useMemo<WeatherUi[]>(
    () => {
      if (!enabled) return EMPTY_WEATHER;
      // TODO: plug in real data later; for now we still return a typed array.
      return EMPTY_WEATHER;
    },
    [enabled]
  );
}

/** Optional: allow both `import useWeather` and `import { useWeather }` */
export default useWeather;
