import { ITEM_IDS, itemBasePrice, type ItemId } from './data';
import { nextRandom } from './rng';
import { isFriday } from './season';
import type { GameState } from './state';

export const COEF_MIN = 0.7;
export const COEF_MAX = 1.4;
export const SELL_DROP = 0.02;
export const REVERT_PER_HOUR = 0.05;
export const NOISE = 0.04;
export const FRIDAY_BONUS = 1.2;

const clamp = (v: number) => Math.min(COEF_MAX, Math.max(COEF_MIN, v));

export function unitPrice(s: GameState, id: ItemId, now: number, coef = s.market.coef[id]): number {
  return Math.max(1, Math.round(itemBasePrice(id) * coef * (isFriday(now) ? FRIDAY_BONUS : 1)));
}

/** Total revenue for selling `qty` units (each unit drops the coefficient by 2%). */
export function quoteSale(s: GameState, id: ItemId, qty: number, now: number): number {
  let coef = s.market.coef[id];
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += unitPrice(s, id, now, coef);
    coef = clamp(coef - SELL_DROP);
  }
  return total;
}

export function applySaleToMarket(s: GameState, id: ItemId, qty: number): void {
  s.market.coef[id] = clamp(s.market.coef[id] - SELL_DROP * qty);
}

/** Once per in-game hour: revert 5% toward 1.0 and add a small random wobble. */
export function marketHourly(s: GameState): void {
  for (const id of ITEM_IDS) {
    const c = s.market.coef[id];
    s.market.prev[id] = c;
    const gap = 1 - c;
    const move = Math.sign(gap) * Math.min(Math.abs(gap), REVERT_PER_HOUR);
    const noise = (nextRandom(s) - 0.5) * NOISE;
    s.market.coef[id] = clamp(c + move + noise);
  }
}

export function trend(s: GameState, id: ItemId): -1 | 0 | 1 {
  const d = s.market.coef[id] - s.market.prev[id];
  if (d > 0.005) return 1;
  if (d < -0.005) return -1;
  return 0;
}
