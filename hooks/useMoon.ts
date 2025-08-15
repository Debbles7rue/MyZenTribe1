import { useMemo } from "react";
import { addDays, startOfYear, endOfYear } from "date-fns";

export type MoonUi = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { moonPhase: 'moon-new' | 'moon-first' | 'moon-full' | 'moon-last' };
};

export function useMoon(year: number, enabled: boolean) {
  return useMemo<MoonUi[]>(() => {
    if (!enabled) return [];
    const SYNODIC = 29.530588, FIRST_Q = 7.382647, FULL = 14.765294, LAST_Q = 22.147941;
    const epoch = new Date(Date.UTC(2000, 0, 6, 18, 14));
    const yearStart = startOfYear(new Date(Date.UTC(year, 0, 1)));
    const yearEnd   = endOfYear(new Date(Date.UTC(year, 11, 31)));
    const daysBetween = (a: Date, b: Date) => (b.getTime() - a.getTime())/86400000;
    let k = Math.floor(daysBetween(epoch, yearStart)/SYNODIC) - 1;

    const out: MoonUi[] = [];
    const push = (d: Date, title: string, key: MoonUi['resource']['moonPhase']) => {
      const local = new Date(d);
      const start = new Date(local.getFullYear(), local.getMonth(), local.getDate());
      out.push({ id:`${key}-${start.toISOString()}`, title, start, end:addDays(start,1), allDay:true, resource:{ moonPhase:key }});
    };
    const maybe = (d: Date, title: string, key: MoonUi['resource']['moonPhase']) => {
      if (d >= addDays(yearStart,-2) && d <= addDays(yearEnd,2)) push(d,title,key);
    };

    for (let i=0;i<20;i++){
      const newMoon = new Date(epoch.getTime()+(k+i)*SYNODIC*86400000);
      if (newMoon > addDays(yearEnd,2)) break;
      const firstQuarter = new Date(newMoon.getTime()+FIRST_Q*86400000);
      const fullMoon     = new Date(newMoon.getTime()+FULL*86400000);
      const lastQuarter  = new Date(newMoon.getTime()+LAST_Q*86400000);
      maybe(newMoon,      "New Moon",     "moon-new");
      maybe(firstQuarter, "First Quarter","moon-first");
      maybe(fullMoon,     "Full Moon",    "moon-full");
      maybe(lastQuarter,  "Last Quarter", "moon-last");
    }
    return out;
  }, [year, enabled]);
}
