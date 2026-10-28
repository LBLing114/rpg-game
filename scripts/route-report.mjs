import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const story = JSON.parse(fs.readFileSync(new URL('../src/data/storyData.json', import.meta.url), 'utf8'));
export function reportRoute(routeIndex, endingIndex = 0, overrides = {}) {
  const state = { inventory: ['letter'], flags: [], ending: null };
  const nodes = [];
  function meets(c) {
    if (!c) return true;
    if (c.all) return c.all.every(meets);
    if (c.any) return c.any.some(meets);
    if (c.not) return !meets(c.not);
    if (c.flag) return state.flags.includes(c.flag);
    if (c.item) return state.inventory.includes(c.item);
    if (c.rule) return meets(story.conditions[c.rule]);
    if ('evidenceAtLeast' in c) return story.evidenceItems.filter(i => state.inventory.includes(i)).length >= c.evidenceAtLeast;
    if ('endingReached' in c) return Boolean(state.ending) === c.endingReached;
    throw new Error('Unknown condition');
  }
  function pick(id, index) {
    const choices = story.dialogues[id].choices;
    const c = choices[index ?? overrides[id] ?? choices.findIndex(c => meets(c.requires))];
    if (!c || !meets(c.requires)) throw new Error(`Unavailable choice: ${id}/${index}`);
    nodes.push(id);
    state.inventory = [...new Set([...state.inventory, ...(c.items ?? [])])];
    state.flags = [...new Set([...state.flags, ...(c.flags ?? [])])];
    state.ending = c.ending ?? state.ending;
    return c.next;
  }
  function walk(id) {
    let count = 0;
    while (id && id !== 'finale') {
      if (++count > 100) throw new Error(`Cycle: ${id}`);
      id = pick(id);
    }
  }
  const route = story.routes[routeIndex];
  if (routeIndex === 0 && endingIndex === 1) overrides = { witnessAttribution: 1, ...overrides };
  if (routeIndex === 3 && endingIndex === 1) overrides = { silenceDraft: 1, ...overrides };
  for (const id of ['intro','aunt','desk','typecase','lin','medicalRegister','doctor','archiveLedger','cabinet']) walk(id);
  if (routeIndex === 0) walk('linAgain');
  if (routeIndex === 1) walk('gu');
  for (const id of ['court0','freight0','tide0','riverArrival']) walk(id);
  walk(pick('finale', routeIndex));
  for (const step of route.steps) walk(step.node);
  walk(pick(route.decision, endingIndex));
  const zh = nodes.map(n => story.dialogues[n].text.zh).join('\n') + story.endings[state.ending].text.zh;
  const en = nodes.map(n => story.dialogues[n].text.en).join('\n') + story.endings[state.ending].text.en;
  // Ending cards repeat the last passage; count it only once in the reading estimate.
  const endingNode = nodes.at(-1);
  const chinese = (zh.match(/[\u4e00-\u9fff]/g) ?? []).length - (story.dialogues[endingNode].text.zh.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const english = en.split(/\s+/).filter(Boolean).length - story.dialogues[endingNode].text.en.split(/\s+/).filter(Boolean).length;
  return { route: route.title.zh, ending: state.ending, title: story.endings[state.ending].title.zh, pages: nodes.length, chinese, english,
    // Comfortable narrative reading, plus 12–18 minutes of navigation and choices.
    zhMinutes: [Math.round(chinese / 300 + 12), Math.round(chinese / 240 + 18)],
    enMinutes: [Math.round(english / 180 + 12), Math.round(english / 140 + 18)], nodes };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reports = story.routes.flatMap((_, i) => [0, 1].map(j => reportRoute(i, j)));
  console.table(reports.map(({ nodes, ...row }) => row));
  if (process.argv.includes('--json')) console.log(JSON.stringify(reports.map(({nodes,...row}) => row), null, 2));
}
