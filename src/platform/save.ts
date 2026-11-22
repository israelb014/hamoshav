// Persistence: localStorage everywhere + Capacitor Preferences on Android (double save).
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { migrate, type GameState } from '../sim/state';

export const SAVE_KEY = 'hamoshav.save';
export const isNative = () => Capacitor.isNativePlatform();

function parse(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('bad save', e);
    return null;
  }
}

export async function loadSave(): Promise<GameState | null> {
  let local: GameState | null = null;
  try {
    local = parse(localStorage.getItem(SAVE_KEY));
  } catch {
    local = null;
  }
  if (!isNative()) return local;
  let pref: GameState | null = null;
  try {
    pref = parse((await Preferences.get({ key: SAVE_KEY })).value);
  } catch {
    pref = null;
  }
  if (local && pref) return (pref.savedAt ?? 0) > (local.savedAt ?? 0) ? pref : local;
  return local ?? pref;
}

export function writeSave(s: GameState): void {
  s.savedAt = Date.now();
  const json = JSON.stringify(s);
  try {
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.warn('localStorage save failed', e);
  }
  if (isNative()) Preferences.set({ key: SAVE_KEY, value: json }).catch((e) => console.warn('prefs save failed', e));
}

export async function clearSave(): Promise<void> {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
  if (isNative()) await Preferences.remove({ key: SAVE_KEY });
}

/** Export: browser download on web, Documents/ file on Android. Returns a message for the user. */
export async function exportSave(s: GameState): Promise<string> {
  const json = JSON.stringify(s, null, 1);
  const d = new Date();
  const name = `hamoshav-save-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  if (isNative()) {
    await Filesystem.writeFile({ path: name, data: json, directory: Directory.Documents, encoding: Encoding.UTF8 });
    return `השמירה נשמרה בתיקיית המסמכים: ${name}`;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'קובץ השמירה הורד';
}

export function parseImport(text: string): GameState {
  return migrate(JSON.parse(text));
}
