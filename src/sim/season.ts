import { HOUR, type Season } from './data';
import { nextRandom, randInt } from './rng';

/** Season from the real calendar date (local time). */
export function seasonOf(date: Date | number): Season {
  const m = new Date(date).getMonth(); // 0 = Jan
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

export function isFriday(date: Date | number): boolean {
  return new Date(date).getDay() === 5;
}

export type WeatherType = 'sun' | 'cloud' | 'rain' | 'heat';

export const TEMP_RANGE: Record<Season, [number, number]> = {
  winter: [10, 17],
  spring: [18, 26],
  summer: [28, 36],
  autumn: [20, 28],
};

export const RAIN_CHANCE: Record<Season, number> = {
  winter: 0.45,
  spring: 0.15,
  autumn: 0.2,
  summer: 0,
};
export const HEAT_CHANCE: Record<Season, number> = {
  winter: 0,
  spring: 0,
  autumn: 0,
  summer: 0.25,
};

export const WEATHER_SLOT_MS = 6 * HOUR;

export function weatherSlot(t: number): number {
  return Math.floor(t / WEATHER_SLOT_MS);
}

export interface Weather {
  slot: number;
  type: WeatherType;
  temp: number;
}

export function rollWeather(h: { rng: number }, slot: number): Weather {
  const season = seasonOf(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS / 2);
  const r = nextRandom(h);
  let type: WeatherType;
  if (r < RAIN_CHANCE[season]) type = 'rain';
  else if (r < RAIN_CHANCE[season] + HEAT_CHANCE[season]) type = 'heat';
  else type = nextRandom(h) < (season === 'summer' ? 0.1 : 0.35) ? 'cloud' : 'sun';
  const [lo, hi] = TEMP_RANGE[season];
  let temp = randInt(h, lo, hi);
  if (type === 'heat') temp = hi + randInt(h, 2, 5);
  if (type === 'rain') temp = Math.max(lo, temp - 2);
  return { slot, type, temp };
}

export const WEATHER_NAMES: Record<WeatherType, string> = {
  sun: 'שמשי',
  cloud: 'מעונן',
  rain: 'גשום',
  heat: 'שרב',
};
