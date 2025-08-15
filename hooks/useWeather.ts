import { useMemo } from "react";
export type WeatherUi = never; // placeholder

export function useWeather(enabled: boolean) {
  return useMemo<WeatherUi[]>(() => {
    if (!enabled) return [];
    return []; // hook ready for future “icons only” implementation
  }, [enabled]);
}
