// Glue between pure sim and the UI / renderer.
import * as A from '../sim/actions';
import type { Result } from '../sim/actions';
import { advance, emptyEvents, type SimEvents } from '../sim/sim';
import type { GameState } from '../sim/state';
import { writeSave } from '../platform/save';

type Actions = typeof A;
type ActionName = { [K in keyof Actions]: Actions[K] extends (s: GameState, ...a: never[]) => Result ? K : never }[keyof Actions];
type Args<K extends ActionName> = Actions[K] extends (s: GameState, ...a: infer P) => Result ? P : never;

export type Listener = () => void;
export type ActionHook = (name: string, res: Result, args: unknown[]) => void;

export class Store {
  s: GameState;
  private listeners = new Set<Listener>();
  private hooks = new Set<ActionHook>();
  saveEnabled = true;

  constructor(s: GameState) {
    this.s = s;
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  onAction(fn: ActionHook): () => void {
    this.hooks.add(fn);
    return () => this.hooks.delete(fn);
  }
  emit(): void {
    for (const l of this.listeners) l();
  }

  act<K extends ActionName>(name: K, ...args: Args<K>): Result {
    this.tick();
    const fn = A[name] as unknown as (s: GameState, ...a: unknown[]) => Result;
    const res = fn(this.s, ...args);
    if (res.ok) this.save();
    for (const h of this.hooks) h(name, res, args);
    this.emit();
    return res;
  }

  /** Advance simulation to now. */
  tick(now = Date.now(), ev: SimEvents = emptyEvents()): SimEvents {
    advance(this.s, now, ev);
    return ev;
  }

  save(): void {
    if (this.saveEnabled) writeSave(this.s);
  }

  replace(s: GameState): void {
    this.s = s;
    this.save();
    this.emit();
  }
}
