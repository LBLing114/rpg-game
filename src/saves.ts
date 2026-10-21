import { decodeSave, encodeSave, MANUAL_KEY, SAVE_KEY, type SaveData } from './engine';
import type { State } from './types';

export const SAVE_SLOTS = ['auto', '1', '2', '3'] as const;
export type SaveSlot = typeof SAVE_SLOTS[number];
const keys: Record<SaveSlot, string> = {
  auto: SAVE_KEY,
  // Keep the original key: existing players retain their manual save in slot 1.
  '1': MANUAL_KEY,
  '2': 'wudu-manual-v1-2',
  '3': 'wudu-manual-v1-3',
};
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
export class SaveStore {
  constructor(private storage: () => StorageAccess = () => localStorage) {}

  read(slot: SaveSlot): SaveData | null {
    try { return decodeSave(this.storage().getItem(keys[slot])); }
    catch { return null; }
  }

  write(slot: SaveSlot, state: State, dialogue: string | null): boolean {
    try {
      this.storage().setItem(keys[slot], encodeSave(state, dialogue));
      return true;
    } catch { return false; }
  }

  latest(): SaveData | null {
    return SAVE_SLOTS.map(slot => this.read(slot))
      .filter((save): save is SaveData => save !== null)
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))[0] ?? null;
  }
}
