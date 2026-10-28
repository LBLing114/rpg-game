import { describe, it, expect } from "vitest";
import {
  arrivalFor,
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
import { eventIsAdjacent, getSpawn, groundPosition, isWalkable, TILE_SIZE, tileCenter, toTile } from "../src/grid";
import type { State } from "../src/types";

function pick(s: State, node: string, i = 0) {
  return choose(s, node, i).state;
}
function finish(s: State, start: string, decisions: Record<string, number> = {}) {
  let node: string | null = start;
  for (let count = 0; node && node !== "finale"; count++) {
    if (count > 100) throw new Error(`Story failed to progress from ${start}`);
    const result = choose(s, node, decisions[node] ?? 0);
    s = result.state;
    node = result.next;
  }
  return s;
}
function completeStory() {
  let s = finish(newGame(), "intro");
  s = finish(s, "aunt");
  s = finish(travel(s, "home"), "desk");
  s = finish(travel(s, "press"), "typecase");
  s = finish(s, "lin");
  s = finish(travel(s, "clinic"), "medicalRegister");
  s = finish(s, "doctor");
  s = finish(s, "gu");
  s = finish(travel(s, "archive"), "archiveLedger");
  s = finish(s, "cabinet");
  s = finish(travel(s, "press"), "linAgain");
  s = finish(travel(s, "lane"), "auntAgain");
  return finish(travel(s, "river"), "riverArrival");
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
  it("the full journey visits all six maps, collects seven items and completes eleven investigation and optional quests", () => {
    const s = completeStory();
    expect(s.visited).toHaveLength(6);
    expect(s.inventory).toHaveLength(7);
    expect(evidenceCount(s)).toBe(3);
    expect(canWitness(s)).toBe(true);
    expect(canEmbers(s)).toBe(true);
    expect(chapter(s).index).toBe(4);
    expect(quests(s).filter((q) => q.done)).toHaveLength(11);
  });
  it("old end-of-investigation saves do not skip the expanded routes", () => {
    const s = completeStory();
    for (let i = 0; i < 4; i++) expect(() => choose(s, "finale", i)).toThrow("Unavailable");
    expect(choose(s, "finale", 4).next).toBeNull();
  });
  it("choices of distrust and non-protection change available endings until revisited", () => {
    let s = finish(finish(newGame(), "aunt"), "desk");
    s = finish(s, "typecase");
    s = finish(s, "lin", { lin: 1 });
    s = finish(s, "medicalRegister");
    s = finish(s, "doctor", { doctor: 1 });
    s = finish(s, "archiveLedger");
    s = finish(s, "cabinet");
    expect(canWitness(s)).toBe(false);
    expect(canEmbers(s)).toBe(false);
    expect(() => choose(s, "finale", 0)).toThrow("Unavailable");
    expect(() => choose(s, "finale", 1)).toThrow("Unavailable");
    s = finish(s, "linAgain");
    expect(canWitness(s)).toBe(true);
    s = finish(s, "doctorAgain");
    s = finish(s, "gu");
    expect(canEmbers(s)).toBe(true);
  });
  it("the photograph and completed recollection are necessary to restore the teacher’s memory", () => {
    expect(() => choose(newGame(), "gu", 0)).toThrow();
    const s = finish(newGame(), "desk");
    expect(pick(s, "gu").flags).not.toContain("remembered");
    expect(finish(s, "gu").flags).toContain("remembered");
  });
  it("repeated conversations never duplicate inventory or flags", () => {
    let s = completeStory();
    s = finish(s, "desk");
    s = finish(s, "doctorSigned");
    s = finish(s, "linAgain");
    expect(s.inventory).toHaveLength(7);
    expect(new Set(s.flags).size).toBe(s.flags.length);
  });
  it("requires investigation before rewards and gates the archive behind the clinic testimony", () => {
    let s = newGame();
    expect(() => choose(s, "lin", 0)).toThrow("Unavailable");
    s = finish(s, "desk");
    expect(() => choose(s, "lin", 0)).toThrow("Unavailable");
    s = finish(s, "typecase");
    const beforeProof = choose(s, "lin", 0);
    expect(beforeProof.state.inventory).not.toContain("proof");
    s = finish(beforeProof.state, beforeProof.next!);
    expect(unlock(s, "clinic")).toBe(true);
    expect(unlock(s, "archive")).toBe(false);
    expect(() => choose(s, "doctor", 0)).toThrow("Unavailable");
    s = finish(s, "medicalRegister");
    s = finish(s, "doctor");
    expect(unlock(s, "archive")).toBe(true);
    expect(() => choose(s, "cabinet", 0)).toThrow("Unavailable");
    s = finish(s, "archiveLedger");
    expect(choose(s, "cabinet", 0).next).toBe("cabinetFiles");
  });
  it.each(["proofQuestion", "routeQuestion"])("wrong deductions at %s explain the gap and allow retry without rewarding or consuming items", node => {
    for (const index of [1, 2]) {
      const s = newGame();
      const wrong = choose(s, node, index);
      expect(wrong.state.inventory).toEqual(s.inventory);
      expect(wrong.state.flags).toEqual(s.flags);
      const retry = choose(wrong.state, wrong.next!, 0);
      expect(retry.next).toBe(node);
      expect(choose(retry.state, node, 0).next).not.toBe(wrong.next);
    }
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
    expect(eventIsAdjacent("river", "lane", s)).toBe(true);
    expect(isWalkable("river", toTile(s).col, toTile(s).row)).toBe(true);
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
  it("migrates old progress without losing earned endings and persists the migrated version", () => {
    const legacy = { state: completeStory(), dialogue: "finale", savedAt: new Date().toISOString() };
    legacy.state.flags = ["intro", "aunt", "trusted", "protected", "remembered", "copied"];
    const restored = decodeSave(JSON.stringify(legacy))!;
    expect(restored.contentVersion).toBe(2);
    expect(restored.state.inventory).toEqual(legacy.state.inventory);
    expect(canWitness(restored.state)).toBe(true);
    expect(canEmbers(restored.state)).toBe(true);
    expect(restored.state.flags).toContain("archiveClue");
    expect(decodeSave(encodeSave(restored.state, restored.dialogue))!.state).toEqual(restored.state);
  });
  it("keeps a legacy save already inside the archive before the clinic was required", () => {
    const legacy = { state: { ...newGame(), scene: "archive", inventory: ["letter", "proof"], visited: ["lane", "press", "archive"] }, dialogue: "cabinet", savedAt: new Date().toISOString() };
    const restored = decodeSave(JSON.stringify(legacy))!;
    expect(restored).not.toBeNull();
    expect(restored.state.scene).toBe("archive");
    expect(restored.dialogue).toBe("cabinet");
    expect(unlock(restored.state, "clinic")).toBe(true);
    expect(unlock(restored.state, "archive")).toBe(true);
    expect(choose(restored.state, "cabinet", 1).next).toBeNull();
  });
  it("does not grant the new preservation branch merely by reloading a current save", () => {
    const s = completeStory();
    s.flags = s.flags.filter(f => f !== "sharedPlan");
    expect(canWitness(decodeSave(encodeSave(s, "linCopies"))!.state)).toBe(false);
  });
  it("resumes mid-opening and mid-deduction without skipping their remaining pages", () => {
    for (const node of ["introPersecution", "proofMistake", "routeQuestion", "doctorWitness"]) {
      const s = completeStory();
      const save = decodeSave(encodeSave(s, node))!;
      expect(save.dialogue).toBe(node);
      expect(save.state).toEqual(s);
    }
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


describe("doorway transfers", () => {
  it.each([
    ["home", 3, 6], ["press", 12, 6], ["clinic", 20, 6],
    ["archive", 3, 12], ["river", 21, 13],
  ] as const)("returns from %s to its own street entrance and keeps the position on reload", (room, col, row) => {
    const unlocked = { ...completeStory(), scene: "lane" as const, ...getSpawn("lane") };
    const inside = travel(unlocked, room);
    expect(eventIsAdjacent(room, "lane", inside)).toBe(true);
    const outside = travel(inside, "lane");
    expect({ x: outside.x, y: outside.y }).toEqual(tileCenter(col, row));
    expect(eventIsAdjacent("lane", room, outside)).toBe(true);
    expect(isWalkable("lane", col, row)).toBe(true);
    expect(decodeSave(encodeSave(outside, null))!.state).toEqual(outside);
    expect(arrivalFor(room, "lane").facing).toBe(room === "river" ? "left" : "down");
  });
  it("arrives inside the door when using the map directly between rooms", () => {
    const s = { ...completeStory(), scene: "home" as const };
    const arrived = travel(s, "clinic");
    expect({ x: arrived.x, y: arrived.y }).toEqual(tileCenter(11, 13));
    expect(arrivalFor("home", "clinic").facing).toBe("up");
  });
  it("selecting the current map never resets the player position", () => {
    const s = { ...newGame(), ...tileCenter(10, 10) };
    expect(travel(s, "lane")).toBe(s);
    expect({ x: s.x, y: s.y }).toEqual(tileCenter(10, 10));
  });
});
