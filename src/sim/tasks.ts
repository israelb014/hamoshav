import { ANIMALS, CROPS, CROP_IDS, PRODUCT_NAMES, itemName, type CropId, type ProductId } from './data';
import { nextRandom, pick } from './rng';
import { seasonOf } from './season';
import { allAnimals, localDay, type GameState, type Task, type TaskType } from './state';

const HARVEST_N: Record<CropId, number> = {
  wheat: 20, tomato: 10, cucumber: 6, corn: 4, strawberry: 4, cauliflower: 3, watermelon: 2,
};

export function generateTasks(s: GameState, now: number): Task[] {
  const season = seasonOf(now);
  const crops = CROP_IDS.filter((c) => CROPS[c].level <= s.level && CROPS[c].seasons.includes(season));
  const products = [...new Set(allAnimals(s).map((x) => ANIMALS[x.a.type].product))];
  const pool: (() => Omit<Task, 'id' | 'progress' | 'claimed' | 'coins' | 'xp' | 'diamonds'>)[] = [
    () => {
      const c = pick(s, crops.length ? crops : (['wheat'] as CropId[]));
      return { type: 'harvest', target: c, n: HARVEST_N[c] };
    },
    () => ({ type: 'sell', n: Math.max(100, Math.round((150 * Math.pow(s.level, 0.9)) / 50) * 50) }),
    () => ({ type: 'plant', n: 8 + s.level * 2 }),
  ];
  if (products.length) {
    pool.push(() => {
      const p = pick(s, products);
      return { type: 'collect', target: p, n: p === 'egg' ? 6 : 3 };
    });
    pool.push(() => ({ type: 'feed', n: 5 + s.level }));
  }
  const chosen = new Set<number>();
  const list: Task[] = [];
  while (list.length < 3) {
    const idx = Math.floor(nextRandom(s) * pool.length);
    if (chosen.has(idx) && chosen.size < pool.length) continue;
    chosen.add(idx);
    const base = pool[idx]();
    list.push({
      ...base,
      id: s.nextId++,
      progress: 0,
      claimed: false,
      coins: 40 + s.level * 15,
      xp: 5 + s.level * 2,
      diamonds: nextRandom(s) < 0.3 ? 1 : 0,
    });
  }
  return list;
}

export function refreshTasksIfNewDay(s: GameState, now: number): void {
  const day = localDay(now);
  if (s.tasks.day !== day) {
    s.tasks.day = day;
    s.tasks.list = generateTasks(s, now);
  }
}

export function progressTask(s: GameState, type: TaskType, amount: number, target?: string): void {
  for (const t of s.tasks.list) {
    if (t.type !== type || t.claimed) continue;
    if (t.target && t.target !== target) continue;
    t.progress = Math.min(t.n, t.progress + amount);
  }
}

export function taskText(t: Task): string {
  switch (t.type) {
    case 'harvest':
      return `קטוף ${t.n} ${itemName(t.target as CropId)}`;
    case 'collect':
      return `אסוף ${t.n} ${PRODUCT_NAMES[t.target as ProductId]}`;
    case 'sell':
      return `מכור ב-${t.n.toLocaleString('he-IL')} מטבעות`;
    case 'feed':
      return `האכל חיות ${t.n} פעמים`;
    case 'plant':
      return `שתול ${t.n} זרעים`;
  }
}
