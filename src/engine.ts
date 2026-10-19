import { dialogues, has, scenes } from "./story";
import { groundPosition, getSpawn } from "./grid";
import {
  type Choice,
  type EndingId,
  type SceneId,
  type State,
  L,
} from "./types";

export const SAVE_KEY = "wudu-save-v1";
export const MANUAL_KEY = "wudu-manual-v1";
export { groundPosition } from "./grid";
export function newGame(): State {
  return {
    version: 1,
    scene: "lane",
    inventory: ["letter"],
    flags: [],
    visited: ["lane"],
    log: [],
    ending: null,
    ...getSpawn("lane"),
  };
}
export function unlock(s: State, scene: SceneId): boolean {
  if (scene === "home") return has(s, "key");
  if (scene === "clinic" || scene === "archive") return has(s, "proof");
  if (scene === "river") return has(s, "record");
  return true;
}
export function lockReason(scene: SceneId) {
  return scene === "home"
    ? L("先向周姨取得旧屋钥匙", "Get the house key from Aunt Zhou first")
    : scene === "river"
      ? L(
          "先在档案室找到转运名册",
          "Find the transfer register in the archive first",
        )
      : L(
          "先到印刷铺寻找第三份校样",
          "Find the third proof at the printing shop first",
        );
}
export function travel(s: State, id: SceneId): State {
  if (!unlock(s, id) || s.ending) return s;
  return {
    ...s,
    scene: id,
    ...getSpawn(id),
    visited: Array.from(new Set([...s.visited, id])),
  };
}
export function choose(
  s: State,
  node: string,
  index: number,
): { state: State; next: string | null } {
  if (s.ending) return { state: s, next: null };
  const choice: Choice | undefined = dialogues[node]?.choices[index];
  if (!choice || (choice.requires && !choice.requires(s)))
    throw new Error("Unavailable story choice");
  return {
    state: {
      ...s,
      inventory: Array.from(new Set([...s.inventory, ...(choice.items ?? [])])),
      flags: Array.from(new Set([...s.flags, ...(choice.flags ?? [])])),
      log: choice.note ? [...s.log, choice.note].slice(-80) : s.log,
      ending: choice.ending ?? s.ending,
    },
    next: choice.next ?? null,
  };
}
export interface SaveData {
  state: State;
  dialogue: string | null;
  savedAt: string;
}
export function encodeSave(state: State, dialogue: string | null): string {
  return JSON.stringify({ state, dialogue, savedAt: new Date().toISOString() });
}
const allItems = [
  "letter",
  "key",
  "photo",
  "proof",
  "record",
  "testimony",
  "ticket",
];
const allFlags = [
  "intro",
  "aunt",
  "trusted",
  "protected",
  "remembered",
  "copied",
  "confessed",
];
const allEndings: EndingId[] = ["witness", "departure", "silence", "embers"];
export function decodeSave(raw: string | null): SaveData | null {
  try {
    if (!raw) return null;
    const d = JSON.parse(raw),
      s = d.state;
    if (
      !s ||
      s.version !== 1 ||
      !scenes.some((x) => x.id === s.scene) ||
      !Array.isArray(s.inventory) ||
      !s.inventory.every((i: string) => allItems.includes(i)) ||
      !s.inventory.includes("letter") ||
      !Array.isArray(s.flags) ||
      !s.flags.every((i: string) => allFlags.includes(i)) ||
      !Array.isArray(s.visited) ||
      !s.visited.every((i: string) => scenes.some((x) => x.id === i)) ||
      !Array.isArray(s.log) ||
      s.log.length > 80 ||
      !s.log.every(
        (t: { zh: string; en: string }) =>
          t && typeof t.zh === "string" && typeof t.en === "string",
      ) ||
      !(s.ending === null || allEndings.includes(s.ending)) ||
      !Number.isFinite(s.x) ||
      !Number.isFinite(s.y) ||
      !(
        d.dialogue === null ||
        (typeof d.dialogue === "string" && Object.hasOwn(dialogues, d.dialogue))
      ) ||
      typeof d.savedAt !== "string" ||
      !Number.isFinite(Date.parse(d.savedAt))
    )
      return null;
    Object.assign(s, groundPosition(s.scene, s.x, s.y));
    if (!unlock(s, s.scene)) return null;
    return d as SaveData;
  } catch {
    return null;
  }
}
