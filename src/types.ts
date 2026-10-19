export type Lang = "zh" | "en";
export type Text = { zh: string; en: string };
export const L = (zh: string, en: string): Text => ({ zh, en });
export type SceneId =
  | "lane"
  | "home"
  | "press"
  | "clinic"
  | "archive"
  | "river";
export type ItemId =
  | "letter"
  | "key"
  | "photo"
  | "proof"
  | "record"
  | "testimony"
  | "ticket";
export type EndingId = "witness" | "departure" | "silence" | "embers";
export type Flag =
  | "intro"
  | "aunt"
  | "trusted"
  | "protected"
  | "remembered"
  | "copied"
  | "confessed";
export interface State {
  version: 1;
  scene: SceneId;
  inventory: ItemId[];
  flags: Flag[];
  visited: SceneId[];
  log: Text[];
  ending: EndingId | null;
  x: number;
  y: number;
}
export interface Choice {
  label: Text;
  next?: string;
  items?: ItemId[];
  flags?: Flag[];
  note?: Text;
  ending?: EndingId;
  requires?: (state: State) => boolean;
}
export interface Dialogue {
  speaker: Text;
  role?: Text;
  portrait?: "shen" | "aunt" | "lin" | "doctor" | "gu" | "narrator";
  text: Text;
  choices: Choice[];
}
export interface Hotspot {
  id: string;
  label: Text;
  kind: "person" | "object" | "exit";
  x: number;
  y: number;
  target?: SceneId;
  dialogue?: (state: State) => string;
}
export interface Scene {
  id: SceneId;
  name: Text;
  subtitle: Text;
  description: Text;
  time: string;
  hotspots: Hotspot[];
}

/** Story conditions are data only; the story adapter never evaluates code. */
export type StoryCondition =
  | { item: ItemId }
  | { flag: Flag }
  | { all: StoryCondition[] }
  | { any: StoryCondition[] }
  | { not: StoryCondition }
  | { evidenceAtLeast: number }
  | { endingReached: boolean }
  | { rule: string };

export interface ItemUse {
  scene: SceneId;
  event: string;
  label: Text;
  hint: Text;
}

export interface StoryItem {
  name: Text;
  description: Text;
  icon: string;
  use: ItemUse;
}

export interface StoryChoiceData extends Omit<Choice, "requires"> {
  requires?: StoryCondition;
}

export interface StoryDialogueData extends Omit<Dialogue, "choices"> {
  choices: StoryChoiceData[];
}

export type DialogueSelector =
  | string
  | { when: StoryCondition; then: string; otherwise: string };

export interface StoryHotspotData extends Omit<Hotspot, "x" | "y" | "dialogue"> {
  dialogue?: DialogueSelector;
}

export interface StorySceneData extends Omit<Scene, "hotspots"> {
  hotspots: StoryHotspotData[];
}

export interface StoryEnding {
  number: string;
  title: Text;
  subtitle: Text;
  text: Text;
}

export interface StoryChapterData {
  index: number;
  title: Text;
  when?: StoryCondition;
}

export interface StoryQuestData {
  title: Text;
  detail: Text;
  complete: StoryCondition;
}

export interface StoryData {
  version: 1;
  flags: Flag[];
  evidenceItems: ItemId[];
  conditions: Record<string, StoryCondition>;
  items: Record<ItemId, StoryItem>;
  dialogues: Record<string, StoryDialogueData>;
  scenes: StorySceneData[];
  endings: Record<EndingId, StoryEnding>;
  /** Ordered highest-priority first; final entry is an unconditional fallback. */
  chapters: StoryChapterData[];
  quests: StoryQuestData[];
}
