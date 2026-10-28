import { dialogues, has, scenes, storyData } from "./story";
import { groundPosition, getSpawn, interactionPoint, type Point } from "./grid";
import type { Facing } from "./characters";
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
  if (scene === "courtyard") return has(s, "record");
  if (scene === "warehouse") return s.flags.includes("courtyardClue");
  if (scene === "waiting") return s.flags.includes("freightClue");
  if (scene === "home") return has(s, "key");
  if (scene === "clinic") return has(s, "proof");
  if (scene === "archive") return has(s, "record") || (has(s, "proof") && (has(s, "testimony") || s.visited.includes("archive")));
  if (scene === "river") return has(s, "record");
  return true;
}
export function lockReason(scene: SceneId) {
  if (scene === "courtyard") return L("找到名册后，沿槐生里西口去后弄核对退信。", "Find the register, then check returned letters in the rear court.");
  if (scene === "warehouse") return L("先在后弄读退信箱，查清货栈编号。", "Examine the returned-letter box in the rear court first.");
  if (scene === "waiting") return L("先核对货栈货单，找出改道的航班。", "Compare the freight papers in the warehouse first.");
  return scene === "home"
    ? L("先向周姨取得旧屋钥匙", "Get the house key from Aunt Zhou first")
    : scene === "archive"
      ? L("先取得印刷校样，再在诊所核对登记并取得医生证言", "Obtain the proof, then examine the clinic register and get Luo’s statement")
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
/** Use the reciprocal door; map shortcuts into a room use its street entrance. */
export function arrivalFor(from: SceneId, to: SceneId): Point & { facing: Facing } {
  const destination = scenes.find(scene => scene.id === to)!;
  const entrance = destination.hotspots.find(event => event.target === from)
    ?? destination.hotspots.find(event => event.target === "lane")
    ?? destination.hotspots.find(event => event.target);
  if (!entrance) return { ...getSpawn(to), facing: "up" };
  const point = interactionPoint(to, entrance.id);
  const dx = point.x - entrance.x, dy = point.y - entrance.y;
  const facing: Facing = Math.abs(dx) > Math.abs(dy)
    ? dx < 0 ? "left" : "right"
    : dy > 0 ? "down" : "up";
  return { ...point, facing };
}
export function travel(s: State, id: SceneId): State {
  if (!unlock(s, id) || s.ending || s.scene === id) return s;
  const { x, y } = arrivalFor(s.scene, id);
  return {
    ...s,
    scene: id,
    x, y,
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
  contentVersion: 2;
  state: State;
  dialogue: string | null;
  savedAt: string;
}
export function encodeSave(state: State, dialogue: string | null): string {
  return JSON.stringify({ contentVersion: 2, state, dialogue, savedAt: new Date().toISOString() });
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
const allFlags: readonly string[] = storyData.flags;
const allEndings = Object.keys(storyData.endings) as EndingId[];
export function decodeSave(raw: string | null): SaveData | null {
  try {
    if (!raw) return null;
    const d = JSON.parse(raw),
      s = d.state;
    if (
      !s ||
      (d.contentVersion !== undefined && d.contentVersion !== 1 && d.contentVersion !== 2) ||
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
    // Legacy saves retain earned routes; a v2 save never gains deductions by reloading.
    if (d.contentVersion !== 2) {
      const earned: string[] = [];
      if (s.inventory.includes("photo") || s.inventory.includes("proof")) earned.push("homeClue");
      if (s.inventory.includes("proof")) earned.push("typeClue");
      if (s.inventory.includes("testimony") || s.inventory.includes("record")) earned.push("medicalClue");
      if (s.inventory.includes("record")) {
        earned.push("archiveClue");
        if (s.flags.includes("trusted")) earned.push("sharedPlan");
      }
      s.flags = Array.from(new Set([...s.flags, ...earned]));
    }
    d.contentVersion = 2;
    Object.assign(s, groundPosition(s.scene, s.x, s.y));
    if (!unlock(s, s.scene)) return null;
    return d as SaveData;
  } catch {
    return null;
  }
}
