import { describe, expect, it } from 'vitest';
import { SaveStore, SAVE_SLOTS } from '../src/saves';
import { encodeSave, MANUAL_KEY, newGame, SAVE_KEY } from '../src/engine';

function memoryStore() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  return { data, storage, saves: new SaveStore(() => storage) };
}
describe('save slots', () => {
  it('recognizes the original manual save as slot 1 without changing it', () => {
    const { data, saves } = memoryStore();
    const legacy = JSON.stringify({ state: newGame(), dialogue: 'introReturn', savedAt: '2026-01-01T00:00:00Z' });
    data.set(MANUAL_KEY, legacy);
    expect(saves.read('1')?.dialogue).toBe('introReturn');
    expect(saves.latest()?.dialogue).toBe('introReturn');
    expect(data.get(MANUAL_KEY)).toBe(legacy);
    expect(data.has(SAVE_KEY)).toBe(false);
  });
  it('keeps three manual slots independent of the autosave and a new story', () => {
    const { saves } = memoryStore();
    const nodes = ['intro', 'introReturn', 'introPersecution', 'introBrother'];
    SAVE_SLOTS.forEach((slot, i) => expect(saves.write(slot, newGame(), nodes[i])).toBe(true));
    saves.write('auto', newGame(), 'introGoal');
    expect(SAVE_SLOTS.map(slot => saves.read(slot)?.dialogue)).toEqual(['introGoal', ...nodes.slice(1)]);
  });
  it('continues the newest valid save while ignoring corrupt entries', () => {
    const { saves, data } = memoryStore();
    data.set(SAVE_KEY, JSON.stringify({ ...JSON.parse(encodeSave(newGame(), 'intro')), savedAt: '2026-01-01T00:00:00Z' }));
    data.set(MANUAL_KEY, JSON.stringify({ ...JSON.parse(encodeSave(newGame(), 'introReturn')), savedAt: '2026-01-02T00:00:00Z' }));
    data.set('wudu-manual-v1-3', '{bad');
    expect(saves.latest()?.dialogue).toBe('introReturn');
    expect(saves.read('3')).toBeNull();
    data.set(MANUAL_KEY, '{bad');
    expect(saves.latest()?.dialogue).toBe('intro');
  });
  it('reports failed writes without deleting or changing existing saves', () => {
    const { data, storage } = memoryStore();
    const original = encodeSave(newGame(), 'introReturn');
    data.set(MANUAL_KEY, original);
    const saves = new SaveStore(() => ({ ...storage, setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); } }));
    expect(saves.write('1', newGame(), 'intro')).toBe(false);
    expect(data.get(MANUAL_KEY)).toBe(original);
  });
  it('handles storage being blocked entirely, including access to localStorage', () => {
    const saves = new SaveStore(() => { throw new DOMException('Blocked', 'SecurityError'); });
    expect(saves.latest()).toBeNull();
    expect(saves.write('2', newGame(), 'intro')).toBe(false);
  });
  it('snapshots coordinates, evidence, choices and dialogue without aliasing live state', () => {
    const { saves } = memoryStore();
    const state = newGame();
    state.inventory.push('key'); state.flags.push('intro'); state.x = 112; state.y = 208;
    saves.write('2', state, 'auntDoor');
    state.inventory.push('photo'); state.x = 368;
    const restored = saves.read('2')!;
    expect(restored.state.inventory).toEqual(['letter', 'key']);
    expect(restored.state.flags).toEqual(['intro']);
    expect([restored.state.x, restored.state.y]).toEqual([112, 208]);
    expect(restored.dialogue).toBe('auntDoor');
  });
});
