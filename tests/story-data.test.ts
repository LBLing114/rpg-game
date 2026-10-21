import { describe, expect, it } from "vitest";
import source from "../src/data/storyData.json";
import {
  canEmbers,
  canWitness,
  dialogues,
  getItemUse,
  meetsCondition,
  scenes,
  validateStoryData,
} from "../src/story";
import { eventPoint } from "../src/grid";
import type { State } from "../src/types";

function state(): State {
  return {
    version: 1, scene: "lane", inventory: ["letter"], flags: [],
    visited: ["lane"], log: [], ending: null, x: 0, y: 0,
  };
}

describe("standalone authored story module", () => {
  it("loads its bilingual module without executable condition or selector code", () => {
    expect(() => validateStoryData(source)).not.toThrow();
    expect(source.dialogues.gu.choices[0].requires).toEqual({ item: "photo" });
    expect(source.scenes[0].hotspots[0].dialogue).toEqual({
      when: { flag: "aunt" }, then: "auntAgain", otherwise: "aunt",
    });
  });

  it.each([
    ["broken prologue reference", (d: any) => { d.prologue[1].node = "missing"; }, "prologue[1].node"],
    ["missing prologue translation", (d: any) => { delete d.prologue[0].period.en; }, "prologue[0].period.en"],
    ["nonlinear prologue", (d: any) => { d.prologue.reverse(); }, "opening must begin at intro"],
    ["missing translation", (d: any) => { delete d.dialogues.intro.text.en; }, "dialogues.intro.text.en"],
    ["broken dialogue link", (d: any) => { d.dialogues.aunt.choices[0].next = "missing"; }, "choices[0].next"],
    ["prototype dialogue link", (d: any) => { d.dialogues.aunt.choices[0].next = "__proto__"; }, "choices[0].next"],
    ["unknown inventory reward", (d: any) => { d.dialogues.desk.choices[0].items = ["missing"]; }, "choices[0].items"],
    ["unknown ending", (d: any) => { d.dialogues.finale.choices[0].ending = "missing"; }, "choices[0].ending"],
    ["invalid event destination", (d: any) => { d.scenes[0].hotspots[2].target = "missing"; }, ".target"],
    ["broken repeat conversation", (d: any) => { d.scenes[0].hotspots[0].dialogue.otherwise = "missing"; }, ".otherwise"],
    ["missing contextual item event", (d: any) => { d.items.photo.use.event = "missing"; }, "items.photo.use.event"],
    ["unknown quest flag", (d: any) => { d.quests[0].complete = { flag: "missing" }; }, "quests[0].complete.flag"],
    ["recursive named rule", (d: any) => { d.conditions.witness = { rule: "embers" }; d.conditions.embers = { rule: "witness" }; }, "cyclic condition"],
    ["missing chapter fallback", (d: any) => { d.chapters.pop(); }, "unconditional fallback"],
    ["duplicate event", (d: any) => { d.scenes[0].hotspots.push(d.scenes[0].hotspots[0]); }, "duplicate entries"],
  ])("rejects %s with the authored path", (_label, corrupt, path) => {
    const copy = structuredClone(source);
    corrupt(copy);
    expect(() => validateStoryData(copy)).toThrow(path);
  });

  it("evaluates composed conditions without consuming inventory", () => {
    const player = state();
    player.inventory.push("photo");
    expect(meetsCondition(player, {
      all: [{ item: "photo" }, { any: [{ flag: "remembered" }, { not: { item: "record" } }] }],
    })).toBe(true);
    expect(dialogues.gu.choices[0].requires?.(player)).toBe(true);
    expect(player.inventory).toEqual(["letter", "photo"]);
    expect(canWitness(player)).toBe(false);
    expect(canEmbers(player)).toBe(false);
    player.inventory.push("proof", "record", "testimony");
    player.flags.push("trusted", "protected", "remembered", "sharedPlan");
    expect(canWitness(player)).toBe(true);
    expect(canEmbers(player)).toBe(true);
  });

  it("resolves authored repeat dialogues as inventory and flags change", () => {
    const aunt = scenes.find((s) => s.id === "lane")!.hotspots.find((h) => h.id === "aunt")!;
    const desk = scenes.find((s) => s.id === "home")!.hotspots.find((h) => h.id === "desk")!;
    const player = state();
    expect(aunt.dialogue?.(player)).toBe("aunt");
    expect(desk.dialogue?.(player)).toBe("desk");
    player.flags.push("aunt");
    player.inventory.push("photo");
    expect(aunt.dialogue?.(player)).toBe("auntAgain");
    expect(desk.dialogue?.(player)).toBe("deskAgain");
  });

  it("gives only owned items a contextual action with a valid map event", () => {
    const player = state();
    expect(getItemUse(player, "photo")).toBeUndefined();
    expect(getItemUse(player, "letter")).toMatchObject({ scene: "lane", event: "aunt" });
    player.inventory.push("photo", "key");
    expect(getItemUse(player, "photo")).toMatchObject({ scene: "clinic", event: "gu" });
    expect(getItemUse(player, "key")).toMatchObject({ scene: "lane", event: "home" });
  });

  it("places all authored events on grid metadata and includes all lane exits", () => {
    for (const scene of scenes) for (const event of scene.hotspots)
      expect({ x: event.x, y: event.y }).toEqual(eventPoint(scene.id, event.id));
    const destinations = scenes.find((s) => s.id === "lane")!.hotspots.map((h) => h.target).filter(Boolean);
    expect(destinations).toEqual(expect.arrayContaining(["home", "press", "clinic", "archive", "river"]));
  });
});
