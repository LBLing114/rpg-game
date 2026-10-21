import "./style.css";
import { artReady } from "./illustrations";
import { World, drawPortrait } from "./art";
import { WORLD_WIDTH, WORLD_HEIGHT } from "./grid";
import { Typewriter } from "./typewriter";
import { Ambience, InterfaceAudio } from "./audio";
import { SaveStore, SAVE_SLOTS, type SaveSlot } from "./saves";
import {
  arrivalFor,
  choose,
  lockReason,
  newGame,
  travel,
  unlock,
  type SaveData,
} from "./engine";
import {
  getItemUse,
  canEmbers,
  canWitness,
  chapter,
  dialogues,
  endings,
  evidenceCount,
  flag,
  has,
  items,
  quests,
  scenes,
} from "./story";
import {
  L,
  type EndingId,
  type Hotspot,
  type ItemId,
  type Lang,
  type SceneId,
  type Text,
} from "./types";

const icons: Record<string, string> = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  fullscreen: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
  boat: '<path d="M3 15h18l-4 5H7zM11 3v11m3-10 6 9h-6z"/>',
  book: '<path d="M3 4h6c2 0 3 1 3 3v14c0-2-1-3-3-3H3zm18 0h-6c-2 0-3 1-3 3v14c0-2 1-3 3-3h6z"/>',
  bag: '<path d="M7 8V6a5 5 0 0 1 10 0v2M4 8h16l1 13H3zM8 12h8"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16"/>',
  sound:
    '<path d="M4 9h4l5-4v14l-5-4H4zm12-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4zm13 0 5 6m0-6-5 6"/>',
  save: '<path d="M4 3h13l4 4v14H3V3zm3 0v7h10V3M7 21v-7h10v7"/>',
  settings:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  rain: '<path d="M5 14a5 5 0 0 1 0-10 6 6 0 0 1 11 0 5 5 0 0 1 2 10M7 17l-2 4m8-4-2 4m8-4-2 4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  letter:
    '<rect x="3" y="5" width="18" height="14"/><path d="m3 5 9 8 9-8m-18 14 6-6m12 6-6-6"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-6 0 3-3"/>',
  photo:
    '<rect x="3" y="3" width="18" height="18"/><circle cx="9" cy="8" r="2"/><path d="m4 19 5-6 4 3 3-6 5 9"/>',
  paper: '<path d="M5 2h10l4 4v16H5zm10 0v5h4M8 11h8m-8 4h8m-8 4h5"/>',
  ticket:
    '<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zm13 0v3m0 2v4m0 2v3"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 6m0 3v1"/>',
};
const icon = (name: string, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.paper}</svg>`;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );
function storageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
let lang: Lang = storageGet("wudu-lang") === "en" ? "en" : "zh";
const t = (value: Text) => escape(value[lang]);
const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
const saves = new SaveStore();
let state = newGame();
let currentDialogue: string | null = "intro";
let atTitle = true;
let selectedSlot: SaveSlot = '1';
let modal: string | null = null;
let selectedItem: ItemId = "letter";
let returnFocus: HTMLElement | null = null;
let toastTimer = 0;
let motion =
  storageGet("wudu-motion") !== "off" &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches;
let collected: EndingId[] = [];
try {
  const data = JSON.parse(storageGet("wudu-endings") || "[]");
  if (Array.isArray(data))
    collected = data.filter((e: EndingId) => Object.hasOwn(endings, e));
} catch {
  /* recover from corrupt collection */
}
const ambience = new Ambience();
const effects = new InterfaceAudio();
effects.enabled = storageGet("wudu-effects") !== "off";
let textSpeed = Number(storageGet("wudu-text-speed") ?? 22);
if (![0, 12, 22].includes(textSpeed)) textSpeed = 22;
let reveal: Typewriter | null = null;
let revealKey = "";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="game-shell">
    <div class="stage" id="stage">
      <canvas id="world" tabindex="0" aria-label="Pixel game scene"></canvas>
      <div class="stage-atmosphere" aria-hidden="true"></div>
      <div class="scene-caption" id="scene-caption"></div>
      <div id="hotspots"></div>
      <button id="game-menu" class="game-menu" data-action="menu" aria-haspopup="dialog"></button>
      <button id="quest-hud" class="quest-hud" data-action="journal"></button>
      <div class="touch-controls" id="touch-controls"></div>
      <section class="dialogue-panel" id="dialogue" aria-label="Story dialogue"></section>
      <section id="title-screen" class="title-screen" aria-labelledby="game-title"></section>
    </div>
  </main>
  <div id="modal-root"></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;
const world = new World(document.querySelector("#world")!);
world.change(state.scene, state.x, state.y);
world.motion = motion;
world.onPosition = (x, y) => {
  if (atTitle) return;
  state.x = x;
  state.y = y;
};
function notify(text: string) {
  const el = document.querySelector("#toast")!;
  el.textContent = text;
  el.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("visible"), 3500);
}
let storageWarningShown = false;
function persist() {
  // Visiting the title, changing its language, or closing the tab must not
  // replace a player's autosave with the decorative title scene.
  if (atTitle) return true;
  const ok = saves.write('auto', state, currentDialogue);
  if (!ok && !storageWarningShown) {
    notify(
      tr(
        "自动保存不可用；请允许浏览器本地存储",
        "Autosave unavailable. Please allow local storage.",
      ),
    );
    storageWarningShown = true;
  }
  return ok;
}
function focusTitle() {
  document.querySelector<HTMLButtonElement>('.title-menu button:not(:disabled)')?.focus({ preventScroll: true });
}
function renderTitle() {
  const el = document.querySelector<HTMLElement>('#title-screen')!;
  el.hidden = !atTitle;
  if (!atTitle) { el.innerHTML = ''; return; }
  const focused = el.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.action : null;
  const available = !!saves.latest();
  el.innerHTML = `<div class="title-heading"><span class="title-year">${tr("上海 · 一九六八", "SHANGHAI · 1968")}</span><h1 id="game-title">雾<span>渡</span></h1><p>THE OTHER SHORE</p></div>
    <nav class="title-menu" aria-label="${tr('开始菜单', 'Title menu')}">
      <button data-action="continue" ${available ? '' : 'disabled'}>${tr('继续游戏', 'Continue')}</button>
      <button data-action="new-story">${tr('新的故事', 'New story')}</button>
      <button data-action="saves">${tr('读取存档', 'Load game')}</button>
      <button data-action="settings">${tr('设置', 'Options')}</button>
    </nav>
    <button class="title-language" data-action="lang" aria-label="${tr('Switch to English', '切换为中文')}">${lang === 'zh' ? '中文 / EN' : '中 / English'}</button>
    <p class="title-controls">${tr('↑ ↓ 选择　Enter 确认', '↑ ↓ Select　Enter Confirm')}</p>`;
  if (focused) el.querySelector<HTMLButtonElement>(`[data-action="${focused}"]`)?.focus({ preventScroll: true });
}
function enterGame(save?: SaveData) {
  state = save?.state ?? newGame();
  currentDialogue = save ? save.dialogue : 'intro';
  atTitle = false;
  revealKey = '';
  closeModal(false);
  world.change(state.scene, state.x, state.y);
  persist();
  render();
  if (state.ending) openModal('ending');
  else document.querySelector<HTMLCanvasElement>('#world')!.focus({ preventScroll: true });
}
function showTitle() {
  world.keys.clear();
  world.stop();
  if (!persist()) {
    notify(tr('进度未能保存，暂未返回标题。请保持当前页面并检查浏览器存储。', 'Could not save progress, so the game is still open. Keep this page open and check browser storage.'));
    return;
  }
  atTitle = true;
  closeModal(false);
  world.change('lane');
  render();
  focusTitle();
}
function saveManual() {
  if (atTitle || selectedSlot === 'auto') return;
  const ok = saves.write(selectedSlot, state, currentDialogue);
  notify(ok ? tr(`已保存至档位 ${selectedSlot}`, `Saved in slot ${selectedSlot}`)
    : tr('存档失败：浏览器存储不可用或已满。原存档未被删除。', 'Save failed: browser storage is unavailable or full. The previous save was not deleted.'));
  openModal('saves');
}
function render() {
  const scene = scenes.find((s) => s.id === state.scene)!;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = tr("雾渡 · The Other Shore", "The Other Shore · 雾渡");
  world.titleMode = atTitle;
  document.querySelector('#stage')!.classList.toggle('at-title', atTitle);
  document.querySelector<HTMLCanvasElement>('#world')!.tabIndex = atTitle ? -1 : 0;
  renderTitle();
  document.querySelector("#game-menu")!.innerHTML = `${icon("menu")}<span>${tr("菜单", "Menu")}</span>`;
  document.querySelector("#scene-caption")!.innerHTML =
    `<span class="scene-number">0${scenes.indexOf(scene) + 1} — ${tr("夜行", "NIGHT WALK")}</span><span>${t(scene.name)}</span>`;
  document.querySelector("#hotspots")!.innerHTML = scene.hotspots
    .map(
      (h) =>
        `<button class="hotspot ${h.kind} ${currentDialogue ? "subdued" : ""}" style="left:${(h.x / WORLD_WIDTH) * 100}%;top:${((h.y - 44) / WORLD_HEIGHT) * 100}%" data-hotspot="${h.id}" aria-label="${t(h.label)}" ${currentDialogue || state.ending ? "disabled" : ""}><span class="hotspot-symbol">${h.kind === "person" ? "···" : h.kind === "exit" ? icon("arrow") : icon("eye")}</span><span class="hotspot-label">${t(h.label)}</span></button>`,
    )
    .join("");
  renderDialogue();
  const activeQuest = quests(state).find(q => !q.done && !q.optional);
  document.querySelector("#quest-hud")!.innerHTML = `${icon('book')} ${activeQuest ? t(activeQuest.title) : tr('长夜已渡', 'The night is behind you')}`;
  document.querySelector("#stage")!.classList.toggle("has-dialogue", !atTitle && !!currentDialogue);
  document.querySelector("#stage")!.classList.toggle("has-ending", !atTitle && !!state.ending);
  document.querySelector("#touch-controls")!.innerHTML = `<button data-move="up" aria-label="${tr('向上','Move up')}">▲</button><button data-move="left" aria-label="${tr('向左','Move left')}">◀</button><button data-move="down" aria-label="${tr('向下','Move down')}">▼</button><button data-move="right" aria-label="${tr('向右','Move right')}">▶</button><button data-action="interact" aria-label="${tr('交互','Interact')}">◎</button>`;
  document
    .querySelector("#world")!
    .setAttribute(
      "aria-label",
      tr(
        `${scene.name.zh}像素场景。WASD 或方向键移动，Enter 或空格交互。`,
        `${scene.name.en} pixel scene. WASD or arrow keys to move. Enter or Space to interact.`,
      ),
    );
  world.enabled = !atTitle && !currentDialogue && !modal && !state.ending;
  if (modal) renderModal();
}
function renderDialogue() {
  const el = document.querySelector<HTMLElement>("#dialogue")!;
  const key = `${currentDialogue ?? ''}:${lang}`;
  const progress = key === revealKey ? reveal?.visibleCount : 0;
  reveal?.dispose();
  reveal = null;
  revealKey = key;
  el.classList.remove("narration");
  delete el.dataset.node;
  if (atTitle) { el.innerHTML = ''; return; }
  if (state.ending) {
    const e = endings[state.ending];
    el.innerHTML = `<div class="quiet-state"><div class="quiet-icon">${icon("boat")}</div><div><span class="eyebrow">${tr("故事的余音", "AFTER THE STORY")} · ${e.number}</span><h2>${t(e.title)}</h2><p>${t(e.subtitle)}</p></div><button class="primary-button" data-action="ending">${tr("阅读结局", "Read ending")}${icon("arrow")}</button></div>`;
    return;
  }
  if (!currentDialogue) { el.innerHTML = ""; return; }
  const d = dialogues[currentDialogue];
  el.dataset.node = currentDialogue;
  const full = d.text[lang];
  const hasPortrait = !!d.portrait && d.portrait !== "narrator";
  el.classList.toggle("narration", !hasPortrait);
  el.innerHTML = `${hasPortrait ? `<div class="dialogue-face"><canvas class="portrait" width="192" height="320" aria-hidden="true"></canvas><div class="speaker-badge"><h2>${t(d.speaker)}</h2><span>${d.role ? t(d.role) : tr("雨夜的低语", "A voice in the rain")}</span></div></div>` : ""}<div class="dialogue-body">${hasPortrait ? "" : `<h2 class="narration-title">${t(d.speaker)}</h2>`}<div class="dialogue-text" tabindex="0" role="button" aria-label="${tr('显示整段对话','Reveal this passage')}"><div class="typing-layout" aria-hidden="true">${escape(full)}</div><div class="typing-visible" aria-hidden="true"></div><span class="sr-only">${escape(full)}</span></div><button class="typing-hint" data-action="advance">${tr('Enter / Space · 显示全文','Enter / Space · Reveal text')}</button><div class="choices" hidden>${d.choices.map((c, i) => (!c.requires || c.requires(state) ? `<button class="choice" data-choice="${i}"><span class="choice-number">${i+1}</span><span>${t(c.label)}</span><span class="choice-cursor" aria-hidden="true">◀</span></button>` : '')).join('')}</div>${currentDialogue === 'finale' ? `<div class="ending-hints">${tr('证据','Evidence')} ${evidenceCount(state)}/3 · ${tr('分存','Copies')} ${flag(state,'sharedPlan')?'✓':'—'} · ${tr('守护','Care')} ${flag(state,'protected')?'✓':'—'} · ${tr('记忆','Memory')} ${flag(state,'remembered')?'✓':'—'} <button data-action="endings">${tr('结局线索','Ending clues')}</button></div>` : ''}</div>`;
  if (hasPortrait) drawPortrait(el.querySelector<HTMLCanvasElement>('.portrait')!.getContext('2d')!, d.portrait);
  const visible = el.querySelector<HTMLElement>('.typing-visible')!;
  const hint = el.querySelector<HTMLButtonElement>('.typing-hint')!;
  const choices = el.querySelector<HTMLElement>('.choices')!;
  reveal = new Typewriter(full, {
    speed: motion ? textSpeed : 0,
    start: progress,
    update: text => { visible.textContent = text; el.dataset.typing = 'true'; },
    tick: () => effects.play('text'),
    complete: () => {
      el.dataset.typing = 'false';
      choices.hidden = false;
      hint.textContent = d.choices.length === 1 ? tr('▼ Enter / Space · 继续','▼ Enter / Space · Continue') : tr('▼ 请选择 · 数字键 / 鼠标','▼ Choose · Number keys / mouse');
    },
  });
}
function advanceText() {
  if (!currentDialogue || modal) return;
  if (reveal && !reveal.isComplete) { reveal.finish(); effects.play(); return; }
  const choices = dialogues[currentDialogue].choices;
  if (choices.length === 1) makeChoice(0);
  else document.querySelector<HTMLButtonElement>('[data-choice]')?.focus({preventScroll:true});
}
function interactNearest() {
  if (modal || state.ending) return;
  if (currentDialogue) { advanceText(); return; }
  const id = world.nearestEvent();
  const h = scenes.find(s=>s.id===state.scene)!.hotspots.find(h=>h.id===id);
  if (h) interact(h);
  else notify(tr('走到人物或物件旁边，或点击头顶标记。','Stand beside a person or object, or click its marker.'));
}
function walkToEvent(h: Hotspot) {
  if (!world.moveToEvent(h.id, () => interact(h))) notify(tr('这里暂时走不过去。','There is no clear path to this event.'));
}
function useItem() {
  const use = getItemUse(state, selectedItem);
  if (!use) return;
  if (currentDialogue) { notify(tr('先完成当前对话，再使用道具。','Finish the current conversation before using an item.')); return; }
  if (state.ending) { notify(tr('在结局画面返回最后选择后，可以继续探索。','Return to the final choice from the ending to keep exploring.')); return; }
  if (use.scene && state.scene !== use.scene) {
    notify(use.hint ? t(use.hint) : tr('请先前往相关地点。','Visit the relevant location first.'));
    return;
  }
  const h = scenes.find(s=>s.id===state.scene)!.hotspots.find(h=>h.id===use.event);
  if (h) { closeModal(false); walkToEvent(h); }
}
function interact(h: Hotspot) {
  if (currentDialogue || modal || state.ending) return;
  if (h.target) go(h.target);
  else if (h.dialogue) {
    currentDialogue = h.dialogue(state);
    world.stop();
    world.keys.clear();
    persist();
    render();
  }
}
function go(id: SceneId) {
  if (state.ending) {
    openModal("ending");
    return;
  }
  if (currentDialogue) {
    notify(tr("请先完成眼前的对话", "Finish the current conversation first"));
    return;
  }
  if (state.scene === id) { closeModal(); return; }
  if (!unlock(state, id)) {
    notify(t(lockReason(id)));
    return;
  }
  const { facing } = arrivalFor(state.scene, id);
  state = travel(state, id);
  world.change(id, state.x, state.y, facing);
  persist();
  closeModal(false);
  render();
  const stage = document.querySelector("#stage")!;
  stage.classList.remove("arriving");
  if (motion) {
    void (stage as HTMLElement).offsetWidth;
    stage.classList.add("arriving");
  }
}
function makeChoice(index: number) {
  if (!currentDialogue || modal) return;
  if (reveal && !reveal.isComplete) { reveal.finish(); return; }
  effects.play();
  const prev = state.inventory.length;
  const result = choose(state, currentDialogue, index);
  state = result.state;
  currentDialogue = result.next;
  if (state.inventory.length > prev)
    notify(
      `${tr("获得", "Received")} · ${state.inventory
        .slice(prev)
        .map((i) => items[i].name[lang])
        .join(" / ")}`,
    );
  if (state.ending && !collected.includes(state.ending)) {
    collected.push(state.ending);
    storageSet("wudu-endings", JSON.stringify(collected));
  }
  persist();
  render();
  if (state.ending) openModal("ending");
  else if (currentDialogue)
    document
      .querySelector<HTMLButtonElement>("[data-choice]")
      ?.focus({ preventScroll: true });
  else
    document
      .querySelector<HTMLCanvasElement>("#world")!
      .focus({ preventScroll: true });
}
function openModal(name: string) {
  if (!modal) returnFocus = document.activeElement as HTMLElement;
  modal = name;
  world.enabled = false;
  world.keys.clear();
  world.stop();
  renderModal();
  document.body.classList.add("modal-open");
  document
    .querySelector<HTMLButtonElement>(".modal-close")
    ?.focus({ preventScroll: true });
}
function closeModal(restore = true) {
  modal = null;
  document.querySelector("#modal-root")!.innerHTML = "";
  document.body.classList.remove("modal-open");
  world.enabled = !atTitle && !currentDialogue && !state.ending;
  document.querySelector<HTMLElement>("#stage")!.inert = false;
  if (restore && returnFocus?.isConnected)
    returnFocus.focus({ preventScroll: true });
  else if (restore && atTitle) focusTitle();
  else if (restore) document.querySelector<HTMLCanvasElement>("#world")!.focus({preventScroll:true});
}
function renderModal() {
  if (!modal) return;
  document.querySelector<HTMLElement>("#stage")!.inert = true;
  const focusedAction = document.querySelector<HTMLElement>(".modal :focus")?.dataset.action;
  let content = "",
    title = "",
    eyebrow = "",
    wide = false;
  if (modal === "menu") {
    title = tr("雾渡", "The Other Shore");
    eyebrow = t(chapter(state).title);
    const scene = scenes.find(s => s.id === state.scene)!;
    const entries = [
      ["bag", "bag", tr("背包", "Belongings"), "I"],
      ["journal", "book", tr("手记", "Journal"), "J"],
      ["map", "map", tr("地图", "Map"), "M"],
      ["endings", "boat", tr("余音", "Endings"), `${collected.length}/4`],
      ["saves", "save", tr("存档 / 读档", "Save / Load"), ""],
      ["settings", "settings", tr("设置", "Options"), ""],
      ["lang", "book", lang === "zh" ? "English" : "中文", ""],
      ["background", "book", tr("故事背景", "Story background"), ""],
      ["help", "help", tr("游玩指南", "How to play"), ""],
      ["fullscreen", "fullscreen", tr("切换全屏", "Toggle fullscreen"), ""],
      ["title", "moon", tr("返回标题", "Return to title"), ""],
    ];
    content = `<p class="modal-intro">${t(scene.name)} · ${scene.time} · ${tr("上海，1968", "Shanghai, 1968")}</p><div class="menu-grid">${entries.map(([action, symbol, label, key]) => `<button data-action="${action}">${icon(symbol)}<span>${label}</span>${key ? `<kbd>${key}</kbd>` : ""}</button>`).join("")}</div><p class="menu-note">${tr("进度自动保存于此浏览器。", "Progress is saved automatically in this browser.")}</p><button class="primary-button menu-resume" data-action="close">${tr("继续游戏", "Resume game")}${icon("arrow")}</button>`;
  } else if (modal === "background") {
    title = tr("故事开始之前", "Before the story");
    eyebrow = "SHANGHAI · 1968";
    const opening = ["intro", "introReturn", "introPersecution", "introBrother", "introLetter", "introGoal"];
    content = `<p class="modal-intro">${tr("真实历史时期下的原创虚构人物与事件。重读背景不会改变当前进度。", "Original fictional characters and events in a real historical period. Reading this does not alter your progress.")}</p><div class="memory-log">${opening.map(id => `<p>${t(dialogues[id].text)}</p>`).join("")}</div>`;
  } else if (modal === "journal") {
    title = tr("旅人手记", "Traveler’s journal");
    eyebrow = "NOTES FROM A LONG NIGHT";
    content = `<p class="modal-intro">${tr("写下的东西，就不再只属于黑夜。", "What is written no longer belongs only to the night.")}</p><div class="journal-entries">${quests(
      state,
    )
      .map(
        (q, i) =>
          `<article class="journal-entry ${q.done ? "complete" : ""}"><span>${q.done ? icon("check") : String(i + 1).padStart(2, "0")}</span><div><h3>${t(q.title)}</h3><p>${t(q.detail)}</p></div><small>${q.done ? tr("已完成", "DONE") : tr("待寻", "OPEN")}</small></article>`,
      )
      .join(
        "",
      )}</div><h3 class="subheading">${tr("沿途记下的话", "Notes along the way")}</h3><div class="memory-log">${state.log.length ? state.log.map((n, i) => `<p><span>${String(i + 1).padStart(2, "0")}</span>${t(n)}</p>`).join("") : `<p>${tr("第一行，留给今夜。", "The first line is waiting for tonight.")}</p>`}</div>`;
  } else if (modal === "bag") {
    title = tr("随身之物", "Belongings");
    eyebrow = `POCKETS OF MEMORY · ${state.inventory.length}/7`;
    if (!state.inventory.includes(selectedItem))
      selectedItem = state.inventory[0];
    content = `<p class="modal-intro">${tr("选择物品查看线索。在对应场景使用道具，会走近相关人物或物件。", "Select an item to inspect it. Use it in the indicated location to approach the relevant person or object.")}</p><div class="bag-grid">${state.inventory.map((id) => `<button class="bag-item ${id === selectedItem ? "selected" : ""}" data-select-item="${id}">${icon(items[id].icon)}<span>${t(items[id].name)}</span></button>`).join("")}</div><div class="item-detail"><div>${icon(items[selectedItem].icon)}</div><h3>${t(items[selectedItem].name)}</h3><p>${t(items[selectedItem].description)}</p><p class="item-hint">${t(items[selectedItem].use.hint)}</p><div class="item-actions"><button class="use-item" data-action="use-item">${t(items[selectedItem].use.label)}</button></div></div>`;
  } else if (modal === "map") {
    title = tr("上海 · 夜行地图", "Shanghai · Night map");
    eyebrow = "SIX PLACES, ONE LONG NIGHT";
    wide = true;
    content = `<p class="modal-intro">${tr("点击已开放的地点前往。故事进展会解锁新的街区；可以随时回访。", "Choose an open location. Follow the story to unlock the district; revisit places at any time.")}</p><div class="district-map">${scenes.map((s, i) => `<button class="map-place ${unlock(state, s.id) ? "" : "locked"} ${state.scene === s.id ? "selected" : ""}" data-scene="${s.id}" data-locked="${!unlock(state, s.id)}" aria-label="${t(s.name)}${unlock(state, s.id) ? "" : " · " + t(lockReason(s.id))}"><span class="map-number">0${i + 1}</span>${icon(unlock(state, s.id) ? "pin" : "lock")}<h3>${t(s.name)}</h3><p>${unlock(state, s.id) ? t(s.subtitle) : t(lockReason(s.id))}</p><small>${state.scene === s.id ? tr("你在这里", "YOU ARE HERE") : state.visited.includes(s.id) ? tr("再次前往", "REVISIT") : unlock(state, s.id) ? tr("前往探索", "EXPLORE") : tr("尚未开放", "NOT YET OPEN")}</small></button>`).join("")}</div>`;
  } else if (modal === "endings") {
    title = tr("长夜的余音", "Echoes of the night");
    eyebrow = `FOUR WAYS TO REACH THE SHORE · ${collected.length}/4`;
    const conditions: Record<EndingId, Text> = {
      witness: L(
        "收集校样、名册与证言；回访林岚，完成分存约定。",
        "Collect all three documents, return to Lin Lan, and complete the preservation plan.",
      ),
      departure: L(
        "获得转运名册与末班船票。",
        "Obtain the transfer register and last ferry ticket.",
      ),
      silence: L(
        "到达江岸后，选择烧毁证据。",
        "Reach the shore, then choose to burn the evidence.",
      ),
      embers: L(
        "获得名册、答应保护医生，并给顾先生看旧屋合影。",
        "Obtain the register, protect the doctor, and show Mr. Gu the photograph.",
      ),
    };
    content = `<p class="modal-intro">${tr("没有完美的选择。只有你愿意带到天亮的东西。结局收集不会因重新开始而清除。", "There is no perfect choice. Only what you choose to carry into the dawn. Discovered endings survive a new game.")}</p><div class="endings-grid">${(Object.keys(endings) as EndingId[]).map((id) => `<article class="ending-tile ${collected.includes(id) ? "discovered" : ""}"><span>${endings[id].number}</span><div><h3>${collected.includes(id) ? t(endings[id].title) : tr("未抵达的岸", "An unreached shore")}</h3><p>${t(conditions[id])}</p><small>${collected.includes(id) ? tr("已解锁", "DISCOVERED") : (id === "witness" && canWitness(state)) || (id === "embers" && canEmbers(state)) || (id === "departure" && has(state, "ticket") && has(state, "record")) || (id === "silence" && has(state, "record")) ? tr("已满足条件 · 在江岸选择", "AVAILABLE AT THE SHORE") : tr("尚待探索", "STILL TO BE FOUND")}</small></div></article>`).join("")}</div>`;
  } else if (modal === "ending") {
    const e = endings[state.ending!];
    title = t(e.title);
    eyebrow = `ENDING ${e.number} / IV · ${tr("长夜的余音", "AN ECHO OF THE NIGHT")}`;
    content = `<div class="ending-art">${icon("boat")}<span>彼 岸</span></div><p class="ending-subtitle">${t(e.subtitle)}</p><div class="ending-prose">${t(
      e.text,
    )
      .split("\n")
      .map((p) => `<p>${p}</p>`)
      .join(
        "",
      )}</div><div class="ending-actions"><button class="primary-button" data-action="return-choice">${tr("回到最后的选择", "Return to the final choice")}${icon("arrow")}</button><button class="secondary-button" data-action="endings">${tr("查看所有余音", "View all endings")}</button></div><p class="fiction-note">${tr("本作人物、地点细节及具体事件均为虚构。以真实历史时期为背景，献给被记住的人。", "The characters, specific events, and local places are fictional. Set against a real historical period, this story is dedicated to those remembered.")}</p>`;
  } else if (modal === "settings") {
    title = tr("灯下小憩", "A pause beneath the lamp");
    eyebrow = "OPTIONS";
    content = `<div class="settings-row"><div><h3>${tr("语言", "Language")}</h3><p>中文 / English</p></div><button class="secondary-button" data-action="lang">${lang === "zh" ? "English" : "中文"}</button></div><div class="settings-row"><div><h3>${tr("雨声与环境音", "Rain & ambience")}</h3><p>${tr("原创合成环境音 · 默认关闭", "Original synthesized ambience · off by default")}</p></div><button class="toggle ${ambience.enabled ? "on" : ""}" data-action="audio" aria-pressed="${ambience.enabled}">${ambience.enabled ? tr("开启", "On") : tr("关闭", "Off")}</button></div><div class="settings-row"><div><h3>${tr("雨景动态", "Rain animation")}</h3><p>${tr("关闭以减少画面动态", "Turn off for reduced motion")}</p></div><button class="toggle ${motion ? "on" : ""}" data-action="motion" aria-pressed="${motion}">${motion ? tr("开启", "On") : tr("关闭", "Off")}</button></div><div class="settings-row"><div><h3>${tr("文字与菜单音效", "Text & menu sounds")}</h3><p>${tr("逐字提示音与选择音", "Typewriter and confirmation tones")}</p></div><button class="toggle ${effects.enabled ? "on" : ""}" data-action="effects" aria-pressed="${effects.enabled}">${effects.enabled ? tr("开启", "On") : tr("关闭", "Off")}</button></div><div class="settings-row"><div><h3>${tr("文字显示速度", "Text speed")}</h3><p>${tr("Enter / Space 可立即显示全文", "Enter / Space reveals the passage instantly")}</p></div><button class="secondary-button" data-action="text-speed">${textSpeed === 0 ? tr("即时", "Instant") : textSpeed === 12 ? tr("快速", "Fast") : tr("标准", "Normal")}</button></div>${atTitle ? '' : `<div class="settings-links"><button class="secondary-button" data-action="saves">${tr('存档 / 读档', 'Save / Load')}</button><button class="danger-button" data-action="reset">${tr('重新开始故事', 'Start a new story')}</button></div>`}`;
  } else if (modal === 'saves') {
    title = atTitle ? tr('读取存档', 'Load game') : tr('存档 / 读档', 'Save / Load');
    eyebrow = tr('记录', 'SAVED GAMES');
    content = `<p class="modal-intro">${tr('存档保存在当前浏览器，不同浏览器或设备不会同步。', 'Saves stay in this browser and do not sync across browsers or devices.')}</p><div class="save-list">${SAVE_SLOTS.map(slot => {
      const save = saves.read(slot);
      const label = slot === 'auto' ? tr('自动存档', 'Autosave') : tr(`档位 ${slot}`, `Slot ${slot}`);
      const scene = save && scenes.find(s => s.id === save.state.scene)!;
      return `<article class="save-slot ${save ? 'occupied' : 'empty'}" data-slot="${slot}">
        <div class="save-slot-info"><h3>${label}</h3>${save && scene
          ? `<p>${t(chapter(save.state).title)} · ${t(scene.name)}</p><small>${save.state.ending ? t(endings[save.state.ending].title) + ' · ' : ''}${escape(new Date(save.savedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'))}</small>`
          : `<p>${tr('— 空 —', '— Empty —')}</p>`}</div>
        <div class="save-slot-actions">${slot !== 'auto' && !atTitle ? `<button class="secondary-button" data-action="slot-save-${slot}" aria-label="${tr(`保存至档位 ${slot}`, `Save to slot ${slot}`)}">${tr('保存', 'Save')}</button>` : ''}
          <button class="secondary-button" data-action="slot-load-${slot}" aria-label="${tr(`读取${label}`, `Load ${label}`)}" ${save ? '' : 'disabled'}>${tr('读取', 'Load')}</button></div></article>`;
    }).join('')}</div><p class="menu-note">${tr('手动档位不会被自动存档或重新开始覆盖。', 'Autosaving and starting a new story leave manual slots intact.')}</p>`;
  } else if (modal === 'reset' || modal === 'load' || modal === 'overwrite') {
    const reset = modal === 'reset', overwrite = modal === 'overwrite';
    title = reset ? tr('开始新的故事？', 'Start a new story?')
      : overwrite ? tr(`覆盖档位 ${selectedSlot}？`, `Overwrite slot ${selectedSlot}?`)
      : tr('读取这份存档？', 'Load this save?');
    content = `<p class="modal-intro">${reset
      ? tr('当前自动进度将被新故事覆盖。三个手动档位和已收集的结局会保留。', 'A new story will replace the autosave. All three manual slots and discovered endings will remain.')
      : overwrite ? tr('该档位中的旧进度将被当前进度替换。其他档位不受影响。', 'The old progress in this slot will be replaced by your current progress. Other slots will remain unchanged.')
      : tr('当前进度将由这份存档替换。需要保留时，请取消并先手动保存。', 'This save will replace your current progress. Cancel and save manually first if you want to keep it.')}</p>
      <div class="confirm-actions"><button class="primary-button" data-action="${reset ? 'confirm-reset' : overwrite ? 'confirm-save' : 'confirm-load'}">${tr('确认', 'Confirm')}</button><button class="secondary-button" data-action="${reset ? 'close' : 'saves'}">${tr('取消', 'Cancel')}</button></div>`;
  } else {
    title = tr("在雨夜中行走", "Walking through the night");
    eyebrow = "A SMALL GUIDE";
    content = `<p class="modal-intro">${tr("《雾渡》是一部首次正常阅读与探索约 25–35 分钟的原创叙事 RPG 原型。没有战斗，也没有倒计时。可以慢慢阅读，反复走访。", "The Other Shore is an original narrative RPG prototype, designed for about 25–35 minutes of first-time reading and exploration. There is no combat or countdown. Read at your own pace and revisit freely.")}</p><div class="help-rows"><p><kbd>WASD / ↑↓←→</kbd>${tr("在场景的街道或地板上移动", "Move along the street or floor")}</p><p><kbd>Enter / Space / E</kbd>${tr("与附近人物、物件或出口交互；显示全文", "Interact with nearby events; reveal the full passage")}</p><p><kbd>1–5</kbd>${tr("选择相应对话；空格推进单选段落", "Choose a dialogue option; Space advances single-choice passages")}</p><p><kbd>J / I / M</kbd>${tr("打开手记 / 行囊 / 地图", "Open journal / belongings / map")}</p><p><kbd>Esc</kbd>${tr("打开 / 关闭菜单；对话需要做出选择", "Open / close the menu; dialogue requires a choice")}</p></div><p class="modal-intro">${tr("鼠标或触屏：点击场景标记交互，点击地面移动，打开地图选择地点旅行。背包中可查看和使用物品。场景时刻是章节氛围，不是游戏计时器。", "Mouse or touch: select markers to interact, the ground to walk, or open the map to travel. Inspect and use items in the bag. Scene times convey atmosphere; they are not a timer.")}</p><p class="fiction-note">${tr("背景：中国文化大革命时期，1968 年的上海。沈砚、沈泊、林岚及所有具体事件均为原创虚构。包含政治迫害、失踪与创伤的非血腥描写。", "Setting: Shanghai in 1968, during China’s Cultural Revolution. Shen Yan, Shen Bo, Lin Lan, and all specific events are original fiction. Contains non-graphic depictions of political persecution, disappearance, and trauma.")}</p>`;
  }
  document.querySelector("#modal-root")!.innerHTML =
    `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""} ${modal === "ending" ? "ending-modal" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" data-action="close" aria-label="${tr("关闭", "Close")}">${icon("close")}</button><span class="eyebrow">${eyebrow}</span><h2 id="modal-title">${title}</h2>${content}</section></div>`;
  if (focusedAction) document.querySelector<HTMLButtonElement>(`.modal [data-action="${focusedAction}"]`)?.focus({ preventScroll: true });
}

async function action(name: string) {
  if (name === 'advance') { advanceText(); return; }
  if (name === 'interact') { interactNearest(); return; }
  if (name === 'use-item') { useItem(); return; }
  if (name === 'effects') {
    effects.enabled = !effects.enabled; effects.unlock();
    storageSet('wudu-effects', effects.enabled ? 'on' : 'off'); renderModal(); return;
  }
  if (name === 'text-speed') {
    textSpeed = textSpeed === 22 ? 12 : textSpeed === 12 ? 0 : 22;
    storageSet('wudu-text-speed', String(textSpeed)); render(); return;
  }
  if (name === 'fullscreen') {
    closeModal();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector<HTMLElement>('#app')!.requestFullscreen();
    } catch { notify(tr('此浏览器暂不支持全屏。','Fullscreen is unavailable in this browser.')); }
    return;
  }
  effects.play(name === 'close' ? 'cancel' : 'confirm');
  if (name === "close") {
    closeModal();
    return;
  }
  if (name === "lang") {
    lang = lang === "zh" ? "en" : "zh";
    storageSet("wudu-lang", lang);
    render();
    return;
  }
  if (name === "audio") {
    try {
      await ambience.toggle();
      render();
    } catch {
      notify(
        tr("此浏览器无法播放环境音", "Audio is unavailable in this browser"),
      );
    }
    return;
  }
  if (name === "motion") {
    motion = !motion;
    world.motion = motion;
    storageSet("wudu-motion", motion ? "on" : "off");
    render();
    return;
  }
  if (name === 'continue') {
    const save = saves.latest();
    if (save) enterGame(save);
    else { render(); notify(tr('没有可读取的存档。', 'No saved game is available.')); }
    return;
  }
  if (name === 'new-story') {
    if (saves.read('auto')) openModal('reset');
    else enterGame();
    return;
  }
  if (name === 'title') { showTitle(); return; }
  const slotAction = /^slot-(save|load)-(auto|1|2|3)$/.exec(name);
  if (slotAction) {
    selectedSlot = slotAction[2] as SaveSlot;
    if (slotAction[1] === 'save') {
      if (atTitle || selectedSlot === 'auto') return;
      if (saves.read(selectedSlot)) openModal('overwrite');
      else saveManual();
    } else {
      const save = saves.read(selectedSlot);
      if (!save) { notify(tr('该存档无法读取。', 'This save could not be read.')); renderModal(); }
      else if (atTitle) enterGame(save);
      else openModal('load');
    }
    return;
  }
  if (name === 'confirm-save') { saveManual(); return; }
  if (name === 'confirm-load') {
    const save = saves.read(selectedSlot);
    if (save) {
      enterGame(save);
      notify(tr('已恢复存档', 'Saved game restored'));
    } else {
      openModal('saves');
      notify(tr('存档无法读取，当前进度已保留。', 'Cannot read this save. Current progress has been kept.'));
    }
    return;
  }
  if (name === 'confirm-reset') { enterGame(); return; }
  if (name === "return-choice") {
    state.ending = null;
    currentDialogue = "finale";
    closeModal(false);
    persist();
    render();
    return;
  }
  if (name === "home" || name === "story") {
    closeModal();
    window.scrollTo({ top: 0, behavior: motion ? "smooth" : "instant" });
    return;
  }
  openModal(name);
}
document.addEventListener("click", (event) => {
  effects.unlock();
  const target = event.target as HTMLElement;
  const a = target.closest<HTMLElement>("[data-action]");
  if (a) {
    event.preventDefault();
    void action(a.dataset.action!);
    return;
  }
  if (target.closest(".dialogue-text")) { if (reveal && !reveal.isComplete) reveal.finish(); return; }
  const choice = target.closest<HTMLElement>("[data-choice]");
  if (choice) {
    makeChoice(Number(choice.dataset.choice));
    return;
  }
  const hs = target.closest<HTMLElement>("[data-hotspot]");
  if (hs) {
    if (currentDialogue || modal) return;
    const h = scenes
      .find((s) => s.id === state.scene)!
      .hotspots.find((h) => h.id === hs.dataset.hotspot)!;
    walkToEvent(h);
    return;
  }
  const scene = target.closest<HTMLElement>("[data-scene]");
  if (scene) {
    go(scene.dataset.scene as SceneId);
    return;
  }
  const item = target.closest<HTMLElement>("[data-item]");
  if (item) {
    selectedItem = item.dataset.item as ItemId;
    openModal("bag");
    return;
  }
  const select = target.closest<HTMLElement>("[data-select-item]");
  if (select) {
    selectedItem = select.dataset.selectItem as ItemId;
    renderModal();
    document
      .querySelector<HTMLButtonElement>(`[data-select-item="${selectedItem}"]`)
      ?.focus();
    return;
  }
  if (target.classList.contains("modal-backdrop")) closeModal();
});
document.querySelector("#stage")!.addEventListener("pointerdown", (event) => {
  if ((event.target as HTMLElement).closest("button, #dialogue") || !world.enabled) return;
  const e = event as PointerEvent,
    r = document.querySelector("#world")!.getBoundingClientRect();
  world.move(
    ((e.clientX - r.left) / r.width) * WORLD_WIDTH,
    ((e.clientY - r.top) / r.height) * WORLD_HEIGHT,
  );
  document
    .querySelector<HTMLCanvasElement>("#world")!
    .focus({ preventScroll: true });
});
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  effects.unlock();
  if (modal) {
    if (key === "escape") {
      event.preventDefault();
      closeModal();
    }
    if (key === "tab") {
      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled), .modal a[href]",
        ),
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !document.querySelector(".modal")!.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !document.querySelector(".modal")!.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
    return;
  }
  if (atTitle) {
    if (['arrowup', 'arrowdown', 'w', 's'].includes(key)) {
      event.preventDefault();
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('.title-menu button:not(:disabled)')];
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const direction = key === 'arrowup' || key === 'w' ? -1 : 1;
      buttons[(current + direction + buttons.length) % buttons.length]?.focus();
      effects.play('confirm');
    } else if (['enter', ' '].includes(key) && !(event.target as HTMLElement).closest('button')) {
      event.preventDefault(); focusTitle();
    }
    return;
  }
  if (
    [
      "arrowleft",
      "arrowright",
      "arrowup",
      "arrowdown",
      "w",
      "a",
      "s",
      "d",
    ].includes(key)
  ) {
    event.preventDefault();
    if (world.enabled) world.keys.add(key);
    return;
  }
  if (event.repeat) return;
  if (["j", "i", "m"].includes(key)) {
    event.preventDefault();
    openModal(key === "j" ? "journal" : key === "i" ? "bag" : "map");
    return;
  }
  if (key === "escape") {
    openModal("menu");
    return;
  }
  // Preserve native keyboard activation for the in-game menu while dialogue is open.
  const focusedButton = (event.target as HTMLElement).closest('button, a');
  if (['enter', ' '].includes(key) && focusedButton &&
      !focusedButton.matches('[data-choice], [data-action="advance"], [data-action="interact"]')) return;
  if (currentDialogue) {
    const choices = dialogues[currentDialogue].choices;
    if (/^[1-5]$/.test(key)) {
      const n = Number(key) - 1, c = choices[n];
      if (c && (!c.requires || c.requires(state))) { event.preventDefault(); makeChoice(n); }
      return;
    }
    if (['enter',' ','e'].includes(key)) {
      event.preventDefault();
      const focused = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]');
      if (focused && reveal?.isComplete && key !== 'e') makeChoice(Number(focused.dataset.choice));
      else advanceText();
    }
    return;
  }
  if (['enter',' ','e'].includes(key) && world.enabled && !(event.target as HTMLElement).closest('button,a')) {
    event.preventDefault(); interactNearest();
  }
});
document.addEventListener("keyup", (e) =>
  world.keys.delete(e.key.toLowerCase()),
);
const moveKeys: Record<string,string> = {up:'w',left:'a',down:'s',right:'d'};
document.addEventListener('pointerdown', e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-move]');
  if (!button || !world.enabled) return;
  e.preventDefault(); effects.unlock();
  world.keys.clear(); world.keys.add(moveKeys[button.dataset.move!]);
  button.setPointerCapture(e.pointerId);
});
document.addEventListener('pointerup', e => {
  if ((e.target as HTMLElement).closest('[data-move]')) world.keys.clear();
});
document.addEventListener('pointercancel', () => world.keys.clear());
window.addEventListener("blur", () => world.keys.clear());
window.addEventListener("pagehide", () => persist());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    world.keys.clear();
    persist();
  }
});
render();
void artReady.then(() => { world.invalidateArt(); render(); }).catch(() => { /* Procedural fallback keeps play available if image decoding fails. */ });
focusTitle();
