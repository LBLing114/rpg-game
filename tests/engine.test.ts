import { describe, it, expect } from "vitest";
import {
  choose,
  decodeSave,
  encodeSave,
  newGame,
  travel,
  unlock,
} from "../src/engine";
import {
  canEmbers,
  canWitness,
  chapter,
  dialogues,
  endings,
  evidenceCount,
  items,
  quests,
  scenes,
} from "../src/story";
import { getSpawn, groundPosition, isWalkable, TILE_SIZE, toTile } from "../src/grid";
import type { State } from "../src/types";

function pick(s: State, node: string, i = 0) {
  return choose(s, node, i).state;
}
function completeStory() {
  let s = pick(newGame(), "intro");
  s = pick(s, "aunt");
  s = pick(s, "auntKey");
  s = travel(s, "home");
  s = pick(s, "desk");
  s = travel(s, "press");
  s = pick(s, "lin");
  s = pick(s, "linProof");
  s = travel(s, "clinic");
  s = pick(s, "doctor");
  s = pick(s, "doctorSigned");
  s = pick(s, "gu");
  s = pick(s, "guMemory");
  s = travel(s, "archive");
  s = pick(s, "cabinet");
  return travel(s, "river");
}

describe("original narrative progression", () => {
  it("starts with a letter and meaningful locked destinations", () => {
    const s = newGame();
    expect(s.inventory).toEqual(["letter"]);
    expect(chapter(s).index).toBe(1);
    expect(unlock(s, "lane")).toBe(true);
    expect(unlock(s, "press")).toBe(true);
    for (const scene of ["home", "clinic", "archive", "river"] as const) {
      expect(unlock(s, scene)).toBe(false);
      expect(travel(s, scene)).toBe(s);
    }
  });
  it("the full journey visits all six maps, collects seven items and completes five quests", () => {
    const s = completeStory();
    expect(s.visited).toHaveLength(6);
    expect(s.inventory).toHaveLength(7);
    expect(evidenceCount(s)).toBe(3);
    expect(canWitness(s)).toBe(true);
    expect(canEmbers(s)).toBe(true);
    expect(chapter(s).index).toBe(4);
    expect(quests(s).filter((q) => q.done)).toHaveLength(5);
  });
  it.each(["witness", "embers", "departure", "silence"] as const)(
    "reaches the %s ending through authored choices",
    (ending) => {
      const s = completeStory();
      const index = dialogues.finale.choices.findIndex(
        (c) => c.ending === ending,
      );
      const result = choose(s, "finale", index);
      expect(result.state.ending).toBe(ending);
      expect(result.next).toBeNull();
      expect(quests(result.state).every((q) => q.done)).toBe(true);
      expect(travel(result.state, "lane")).toBe(result.state);
    },
  );
  it("choices of distrust and non-protection change available endings until revisited", () => {
    let s = newGame();
    s = pick(s, "lin", 1);
    s = pick(s, "linProof");
    s = pick(s, "doctor", 1);
    s = pick(s, "doctorSigned");
    s = pick(s, "cabinet");
    expect(canWitness(s)).toBe(false);
    expect(canEmbers(s)).toBe(false);
    expect(() => choose(s, "finale", 0)).toThrow("Unavailable");
    expect(() => choose(s, "finale", 1)).toThrow("Unavailable");
    s = pick(s, "linAgain");
    expect(canWitness(s)).toBe(true);
    s = pick(s, "doctorAgain");
    s = pick(s, "desk");
    s = pick(s, "gu");
    expect(canEmbers(s)).toBe(true);
  });
  it("the photograph is necessary to restore the teacher’s memory", () => {
    expect(() => choose(newGame(), "gu", 0)).toThrow();
    const s = pick(newGame(), "desk");
    expect(pick(s, "gu").flags).toContain("remembered");
  });
  it("repeated conversations never duplicate inventory or flags", () => {
    let s = completeStory();
    s = pick(s, "desk");
    s = pick(s, "doctorSigned");
    s = pick(s, "linAgain");
    expect(s.inventory).toHaveLength(7);
    expect(new Set(s.flags).size).toBe(s.flags.length);
  });
  it("visiting a locked location leaves state intact", () => {
    const s = newGame();
    expect(travel(s, "archive")).toEqual(s);
  });
  it("all dialogue links, item rewards, map interactions, and both translations exist", () => {
    for (const [id, d] of Object.entries(dialogues)) {
      expect(d.text.zh.length, id).toBeGreaterThan(10);
      expect(d.text.en.length, id).toBeGreaterThan(10);
      expect(d.choices.length, id).toBeGreaterThan(0);
      for (const c of d.choices) {
        expect(c.label.zh).toBeTruthy();
        expect(c.label.en).toBeTruthy();
        if (c.next) expect(dialogues[c.next], id).toBeDefined();
        for (const item of c.items ?? []) expect(items[item]).toBeDefined();
        if (c.ending) expect(endings[c.ending]).toBeDefined();
      }
    }
    for (const s of scenes)
      for (const h of s.hotspots) {
        if (h.dialogue) {
          expect(dialogues[h.dialogue(newGame())]).toBeDefined();
          expect(dialogues[h.dialogue(completeStory())]).toBeDefined();
        }
        if (h.target) expect(scenes.some((s) => s.id === h.target)).toBe(true);
      }
  });
});

describe("save integrity", () => {
  it("starts river travel on the quay and restores obsolete coordinates to walkable grid centers", () => {
    const s = completeStory();
    expect({ x: s.x, y: s.y }).toEqual(getSpawn("river"));
    // A save from the old continuous-movement renderer can point into the water.
    s.x = 259;
    s.y = 233;
    const restored = decodeSave(encodeSave(s, null))!.state;
    expect({ x: restored.x, y: restored.y }).toEqual(
      groundPosition("river", s.x, s.y),
    );
    const tile = toTile(restored);
    expect(isWalkable("river", tile.col, tile.row)).toBe(true);
    expect(restored.x % TILE_SIZE).toBe(TILE_SIZE / 2);
    expect(restored.y % TILE_SIZE).toBe(TILE_SIZE / 2);
  });
  it("roundtrips inventory, decisions, position, and in-progress dialogue", () => {
    const state = completeStory();
    const decoded = decodeSave(encodeSave(state, "finale"))!;
    expect(decoded.state).toEqual(state);
    expect(decoded.dialogue).toBe("finale");
  });
  it.each([null, "", "{}", "broken", '{"state":{"version":2}}'])(
    "recovers from malformed save %s",
    (value) => {
      expect(decodeSave(value)).toBeNull();
    },
  );
  it("rejects unknown scenes, items, flags, dialogue, endings and invalid coordinates", () => {
    const valid = JSON.parse(encodeSave(newGame(), "intro"));
    for (const change of [
      { scene: "missing" },
      { inventory: ["letter", "ghost"] },
      { flags: ["ghost"] },
      { x: NaN },
      { ending: "ghost" },
      { log: [null] },
      { scene: "river" },
    ]) {
      expect(
        decodeSave(
          JSON.stringify({ ...valid, state: { ...valid.state, ...change } }),
        ),
      ).toBeNull();
    }
    expect(
      decodeSave(JSON.stringify({ ...valid, dialogue: "__proto__" })),
    ).toBeNull();
    expect(
      decodeSave(JSON.stringify({ ...valid, savedAt: "nonsense" })),
    ).toBeNull();
  });
  it("clamps loaded positions to the walkable ground", () => {
    const s = newGame();
    s.x = 10000;
    s.y = -5;
    const save = decodeSave(encodeSave(s, null));
    expect(save).not.toBeNull();
    const position = save!.state;
    expect({ x: position.x, y: position.y }).toEqual(
      groundPosition("lane", s.x, s.y),
    );
    const tile = toTile(position);
    expect(isWalkable("lane", tile.col, tile.row)).toBe(true);
    expect(position.x % TILE_SIZE).toBe(TILE_SIZE / 2);
    expect(position.y % TILE_SIZE).toBe(TILE_SIZE / 2);
  });
});
