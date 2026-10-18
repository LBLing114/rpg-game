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
