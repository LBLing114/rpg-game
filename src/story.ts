import rawStoryData from "./data/storyData.json" with { type: "json" };
import { eventPoint } from "./grid";
import type {
  Dialogue,
  DialogueSelector,
  EndingId,
  Flag,
  ItemId,
  ItemUse,
  Scene,
  SceneId,
  State,
  StoryCondition,
  StoryData,
  Text,
} from "./types";

const sceneIds: SceneId[] = ["lane", "home", "press", "clinic", "archive", "river"];
const itemIds: ItemId[] = ["letter", "key", "photo", "proof", "record", "testimony", "ticket"];
const endingIds: EndingId[] = ["witness", "departure", "silence", "embers"];
const flagIds: Flag[] = ["intro", "aunt", "trusted", "protected", "remembered", "copied", "confessed"];
const portraitIds = ["shen", "aunt", "lin", "doctor", "gu", "narrator"];

/** Fail early with a precise content path when an authored module is malformed. */
export function validateStoryData(input: unknown): asserts input is StoryData {
  const fail = (path: string, message: string): never => {
    throw new Error(`Invalid story data at ${path}: ${message}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return fail(path, "expected an object");
    return value as Record<string, unknown>;
  };
  const list = (value: unknown, path: string): unknown[] => {
    if (!Array.isArray(value)) return fail(path, "expected an array");
    return value;
  };
  const text = (value: unknown, path: string): string => {
    if (typeof value !== "string" || !value.trim())
      return fail(path, "expected a nonempty string");
    return value;
  };
  const bilingual = (value: unknown, path: string) => {
    const localized = object(value, path);
    text(localized.zh, `${path}.zh`);
    text(localized.en, `${path}.en`);
  };
  const member = (value: unknown, ids: readonly string[], path: string) => {
    const id = text(value, path);
    if (!ids.includes(id)) fail(path, `unknown reference "${id}"`);
    return id;
  };
  const own = (value: unknown, dict: Record<string, unknown>, path: string) => {
    const id = text(value, path);
    if (!Object.hasOwn(dict, id)) fail(path, `unknown reference "${id}"`);
    return id;
  };
  const unique = (values: unknown[], path: string) => {
    if (new Set(values).size !== values.length) fail(path, "duplicate entries");
  };
  const data = object(input, "story");
  if (data.version !== 1) fail("version", "unsupported version");
  const flags = list(data.flags, "flags");
  unique(flags, "flags");
  for (const id of flags) member(id, flagIds, "flags");
  for (const id of flagIds)
    if (!flags.includes(id)) fail("flags", `missing flag "${id}"`);
  const items = object(data.items, "items");
  const dialogues = object(data.dialogues, "dialogues");
  const endings = object(data.endings, "endings");
  const rules = object(data.conditions, "conditions");
  const sceneList = list(data.scenes, "scenes");
  const sceneRecords = sceneList.map((scene, i) => object(scene, `scenes[${i}]`));
  const authoredSceneIds = sceneRecords.map((scene, i) =>
    member(scene.id, sceneIds, `scenes[${i}].id`),
  );
  unique(authoredSceneIds, "scenes");
  for (const id of sceneIds)
    if (!authoredSceneIds.includes(id)) fail("scenes", `missing scene "${id}"`);
  for (const id of itemIds) own(id, items, "items");
  for (const id of Object.keys(items)) member(id, itemIds, "items");
  for (const id of endingIds) own(id, endings, "endings");
  for (const id of Object.keys(endings)) member(id, endingIds, "endings");
  own("intro", dialogues, "dialogues");
  own("finale", dialogues, "dialogues");
  own("witness", rules, "conditions");
  own("embers", rules, "conditions");
  const evidence = list(data.evidenceItems, "evidenceItems");
  if (!evidence.length) fail("evidenceItems", "expected at least one item");
  unique(evidence, "evidenceItems");
  for (const id of evidence) own(id, items, "evidenceItems");

  const condition = (value: unknown, path: string, stack: string[] = [], depth = 0): void => {
    if (depth > 40) fail(path, "condition nesting is too deep");
    const node = object(value, path);
    const keys = Object.keys(node);
    if (keys.length !== 1) fail(path, "expected exactly one condition operator");
    const key = keys[0];
    switch (key) {
      case "item":
        own(node.item, items, `${path}.item`);
        return;
      case "flag":
        member(node.flag, flagIds, `${path}.flag`);
        return;
      case "all":
      case "any": {
        const children = list(node[key], `${path}.${key}`);
        if (!children.length) fail(path, "a condition group must not be empty");
        children.forEach((child, i) => condition(child, `${path}.${key}[${i}]`, stack, depth + 1));
        return;
      }
      case "not":
        condition(node.not, `${path}.not`, stack, depth + 1);
        return;
      case "evidenceAtLeast":
        if (!Number.isInteger(node.evidenceAtLeast) || (node.evidenceAtLeast as number) < 0 ||
            (node.evidenceAtLeast as number) > evidence.length)
          fail(path, "evidence threshold is outside the available evidence count");
        return;
      case "endingReached":
        if (typeof node.endingReached !== "boolean") fail(path, "expected a boolean");
        return;
      case "rule": {
        const id = own(node.rule, rules, `${path}.rule`);
        if (stack.includes(id)) fail(path, `cyclic condition rule "${id}"`);
        condition(rules[id], `conditions.${id}`, [...stack, id], depth + 1);
        return;
      }
      default:
        fail(path, `unknown condition operator "${key}"`);
    }
  };
  for (const [id, rule] of Object.entries(rules)) condition(rule, `conditions.${id}`, [id]);
  const selector = (value: unknown, path: string) => {
    if (typeof value === "string") {
      own(value, dialogues, path);
      return;
    }
    const selection = object(value, path);
    condition(selection.when, `${path}.when`);
    own(selection.then, dialogues, `${path}.then`);
    own(selection.otherwise, dialogues, `${path}.otherwise`);
  };

  for (const [id, entry] of Object.entries(dialogues)) {
    const path = `dialogues.${id}`;
    const dialogue = object(entry, path);
    bilingual(dialogue.speaker, `${path}.speaker`);
    bilingual(dialogue.text, `${path}.text`);
    if (dialogue.role !== undefined) bilingual(dialogue.role, `${path}.role`);
    if (dialogue.portrait !== undefined) member(dialogue.portrait, portraitIds, `${path}.portrait`);
    const choices = list(dialogue.choices, `${path}.choices`);
    if (!choices.length) fail(path, "dialogue needs at least one choice to close or continue");
    choices.forEach((entry, i) => {
      const pathChoice = `${path}.choices[${i}]`;
      const choice = object(entry, pathChoice);
      bilingual(choice.label, `${pathChoice}.label`);
      if (choice.next !== undefined) own(choice.next, dialogues, `${pathChoice}.next`);
      if (choice.ending !== undefined) own(choice.ending, endings, `${pathChoice}.ending`);
      if (choice.ending !== undefined && choice.next !== undefined)
        fail(pathChoice, "an ending cannot also advance to another dialogue");
      if (choice.items !== undefined)
        list(choice.items, `${pathChoice}.items`).forEach((item) => own(item, items, `${pathChoice}.items`));
      if (choice.flags !== undefined)
        list(choice.flags, `${pathChoice}.flags`).forEach((flag) => member(flag, flagIds, `${pathChoice}.flags`));
      if (choice.note !== undefined) bilingual(choice.note, `${pathChoice}.note`);
      if (choice.requires !== undefined) condition(choice.requires, `${pathChoice}.requires`);
    });
  }

  for (const scene of sceneRecords) {
    const path = `scenes.${scene.id}`;
    for (const key of ["name", "subtitle", "description"])
      bilingual(scene[key], `${path}.${key}`);
    if (!/^\d{2}:\d{2}$/.test(text(scene.time, `${path}.time`))) fail(path, "expected HH:MM time");
    const events = list(scene.hotspots, `${path}.hotspots`);
    const ids: string[] = [];
    events.forEach((entry, i) => {
      const pathEvent = `${path}.hotspots[${i}]`;
      const event = object(entry, pathEvent);
      ids.push(text(event.id, `${pathEvent}.id`));
      bilingual(event.label, `${pathEvent}.label`);
      member(event.kind, ["person", "object", "exit"], `${pathEvent}.kind`);
      if (event.target !== undefined) member(event.target, authoredSceneIds, `${pathEvent}.target`);
      if (event.dialogue !== undefined) selector(event.dialogue, `${pathEvent}.dialogue`);
      if (event.target === undefined && event.dialogue === undefined)
        fail(pathEvent, "event must have a destination or a dialogue");
    });
    unique(ids, `${path}.hotspots`);
  }

  for (const [id, entry] of Object.entries(items)) {
    const path = `items.${id}`;
    const item = object(entry, path);
    bilingual(item.name, `${path}.name`);
    bilingual(item.description, `${path}.description`);
    text(item.icon, `${path}.icon`);
    const use = object(item.use, `${path}.use`);
    const sceneId = member(use.scene, authoredSceneIds, `${path}.use.scene`);
    const scene = sceneRecords.find((scene) => scene.id === sceneId)!;
    const eventIds = (scene.hotspots as Record<string, unknown>[]).map((event) => event.id as string);
    member(use.event, eventIds, `${path}.use.event`);
    bilingual(use.label, `${path}.use.label`);
    bilingual(use.hint, `${path}.use.hint`);
  }
  for (const [id, entry] of Object.entries(endings)) {
    const path = `endings.${id}`;
    const ending = object(entry, path);
    text(ending.number, `${path}.number`);
    for (const key of ["title", "subtitle", "text"])
      bilingual(ending[key], `${path}.${key}`);
  }
  const chapters = list(data.chapters, "chapters");
  if (!chapters.length) fail("chapters", "expected at least one chapter");
  const chapterIndices: unknown[] = [];
  chapters.forEach((entry, i) => {
    const chapter = object(entry, `chapters[${i}]`);
    if (!Number.isInteger(chapter.index) || (chapter.index as number) < 1)
      fail(`chapters[${i}].index`, "expected a positive integer");
    chapterIndices.push(chapter.index);
    bilingual(chapter.title, `chapters[${i}].title`);
    if (i === chapters.length - 1) {
      if (chapter.when !== undefined) fail("chapters", "last chapter must be an unconditional fallback");
    } else condition(chapter.when, `chapters[${i}].when`);
  });
  unique(chapterIndices, "chapters");
  const quests = list(data.quests, "quests");
  if (!quests.length) fail("quests", "expected at least one quest");
  quests.forEach((entry, i) => {
    const quest = object(entry, `quests[${i}]`);
    bilingual(quest.title, `quests[${i}].title`);
    bilingual(quest.detail, `quests[${i}].detail`);
    condition(quest.complete, `quests[${i}].complete`);
  });
}

validateStoryData(rawStoryData);
export const storyData: StoryData = rawStoryData;

export const has = (s: State, item: ItemId) => s.inventory.includes(item);
export const flag = (s: State, f: Flag) => s.flags.includes(f);
export const evidenceCount = (s: State) =>
  storyData.evidenceItems.filter((item) => has(s, item)).length;

export function meetsCondition(state: State, condition: StoryCondition): boolean {
  if ("item" in condition) return has(state, condition.item);
  if ("flag" in condition) return flag(state, condition.flag);
  if ("all" in condition) return condition.all.every((child) => meetsCondition(state, child));
  if ("any" in condition) return condition.any.some((child) => meetsCondition(state, child));
  if ("not" in condition) return !meetsCondition(state, condition.not);
  if ("evidenceAtLeast" in condition) return evidenceCount(state) >= condition.evidenceAtLeast;
  if ("endingReached" in condition) return (state.ending !== null) === condition.endingReached;
  return meetsCondition(state, storyData.conditions[condition.rule]);
}
export const canWitness = (s: State) => meetsCondition(s, storyData.conditions.witness);
export const canEmbers = (s: State) => meetsCondition(s, storyData.conditions.embers);

export const items = storyData.items;
export function getItemUse(state: State, item: ItemId): ItemUse | undefined {
  return has(state, item) ? items[item].use : undefined;
}

export const dialogues: Record<string, Dialogue> = Object.fromEntries(
  Object.entries(storyData.dialogues).map(([id, dialogue]) => [id, {
    ...dialogue,
    choices: dialogue.choices.map(({ requires, ...choice }) => ({
      ...choice,
      ...(requires ? { requires: (state: State) => meetsCondition(state, requires) } : {}),
    })),
  }]),
);

function selectDialogue(state: State, selector: DialogueSelector): string {
  return typeof selector === "string"
    ? selector
    : meetsCondition(state, selector.when) ? selector.then : selector.otherwise;
}
export const scenes: Scene[] = storyData.scenes.map((scene) => ({
  ...scene,
  hotspots: scene.hotspots.map(({ dialogue, ...event }) => ({
    ...event,
    ...eventPoint(scene.id, event.id),
    ...(dialogue ? { dialogue: (state: State) => selectDialogue(state, dialogue) } : {}),
  })),
}));
export const endings = storyData.endings;

export function chapter(state: State): { index: number; title: Text } {
  const selected = storyData.chapters.find((entry) => !entry.when || meetsCondition(state, entry.when))!;
  return { index: selected.index, title: selected.title };
}
export function quests(state: State): { title: Text; detail: Text; done: boolean }[] {
  return storyData.quests.map(({ title, detail, complete }) => ({
    title, detail, done: meetsCondition(state, complete),
  }));
}
