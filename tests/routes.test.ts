import { describe, expect, it } from 'vitest';
import { choose, newGame, travel, unlock, encodeSave, decodeSave } from '../src/engine';
import { activeRoute, dialogues, endingAvailable, endingReturnNode, objective, quests, scenes, storyData } from '../src/story';
import { eventIsAdjacent, interactionPoint } from '../src/grid';
import type { State, SceneId } from '../src/types';

function read(state: State, start: string, decisions: Record<string, number> = {}) {
  let node: string | null = start;
  const seen: string[] = [];
  while (node && node !== 'finale') {
    if (seen.length > 100) throw new Error(`Cycle at ${node}`);
    seen.push(node);
    const index = decisions[node] ?? dialogues[node].choices.findIndex(c => !c.requires || c.requires(state));
    const result = choose(state, node, index);
    state = result.state; node = result.next;
  }
  return { state, seen };
}
function inspect(state: State, scene: SceneId, event: string, decisions: Record<string, number> = {}) {
  expect(unlock(state, scene)).toBe(true);
  state = travel(state, scene);
  const point = interactionPoint(scene, event, state);
  expect(eventIsAdjacent(scene, event, point)).toBe(true);
  state = { ...state, ...point };
  const node = scenes.find(s => s.id === scene)!.hotspots.find(h => h.id === event)!.dialogue!(state);
  return read(state, node, decisions);
}
function prelude() {
  let s = read(newGame(), 'intro').state;
  for (const [scene, event] of [
    ['lane','aunt'],['home','desk'],['press','typecase'],['press','lin'],
    ['clinic','register'],['clinic','doctor'],['clinic','gu'],['archive','ledger'],
    ['archive','cabinet'],['press','lin'],['lane','aunt'],
  ] as const) s = inspect(s, scene, event).state;
  return s;
}
function investigated(decisions: Record<string, number> = {}) {
  let s = prelude();
  for (const [scene, event] of [['courtyard','letters'],['warehouse','freight'],['waiting','timetable'],['river','finale']] as const)
    s = inspect(s, scene, event, decisions).state;
  return s;
}

describe('an hour-long investigation with separate committed routes', () => {
  it('requires all three connected investigations before any route can be chosen', () => {
    let s = prelude();
    expect(objective(s)).toEqual({scene:'courtyard',event:'letters'});
    expect(unlock(s, 'warehouse')).toBe(false);
    expect(unlock(s, 'waiting')).toBe(false);
    expect(inspect(s,'river','finale').seen).toEqual(['riverSurvey']);
    for (let i=0;i<4;i++) expect(() => choose(s,'finale',i)).toThrow('Unavailable');
    s = inspect(s,'courtyard','letters').state;
    expect(unlock(s,'warehouse')).toBe(true);
    expect(unlock(s,'waiting')).toBe(false);
    s = inspect(s,'warehouse','freight').state;
    expect(unlock(s,'waiting')).toBe(true);
    s = inspect(s,'waiting','timetable').state;
    expect(objective(s)).toEqual({scene:'river',event:'finale'});
  });

  for (const [routeIndex, route] of storyData.routes.entries()) for (const [endingIndex, ending] of route.endings.entries()) {
    it(`plays ${ending} through physical tasks, saves, decisions and an aftermath`, () => {
      let s = investigated();
      const committed = choose(s,'finale',routeIndex);
      expect(committed.state.ending).toBeNull();
      s = read(committed.state,committed.next!).state;
      expect(activeRoute(s)).toEqual(route);
      for (let i=0;i<4;i++) expect(() => choose(s,'finale',i)).toThrow('Unavailable');
      expect(inspect(s,'waiting','window').seen).toEqual(['routeWait']);
      expect(() => choose(s,route.decision,endingIndex)).toThrow('Unavailable');
      const last = route.steps.at(-1)!;
      expect(inspect(s,last.scene,last.event).seen).toEqual(['routeWait']);
      const decisions: Record<string, number> = ending === 'anonymous' ? {witnessAttribution:1} : ending === 'letterKept' ? {silenceDraft:1} : {};
      for (const step of route.steps) {
        expect(objective(s)).toMatchObject({scene:step.scene,event:step.event});
        s = inspect(s,step.scene,step.event,decisions).state;
        expect(s.flags).toContain(step.flag);
        expect(inspect(s,step.scene,step.event).seen).toEqual(['routeDone']);
        const restored = decodeSave(encodeSave(s,null))!;
        expect(restored.state).toEqual(s);
        s = restored.state;
      }
      expect(endingAvailable(s,ending)).toBe(true);
      expect(objective(s)).toEqual({scene:'waiting',event:'window'});
      s = travel(s,'waiting');
      const c = choose(s,route.decision,endingIndex);
      expect(c.state.ending).toBeNull();
      const aftermath = read(c.state,c.next!);
      expect(aftermath.seen).toHaveLength(3);
      expect(aftermath.state.ending).toBe(ending);
      expect(quests(aftermath.state).every(q=>q.done)).toBe(true);
      expect(endingReturnNode(aftermath.state)).toBe(route.decision);
      expect(decodeSave(encodeSave(aftermath.state,null))!.state.ending).toBe(ending);
    });
  }
  it('earlier privacy decisions lead to distinct later scenes, not just a changed label', () => {
    for (const publicChoice of [0,1]) {
      let s = investigated({courtChoice:publicChoice,freightChoice:publicChoice});
      const chosen = choose(s,'finale',0);s=read(chosen.state,chosen.next!).state;
      s = inspect(s,'warehouse','seal').state;
      const result = inspect(s,'courtyard','relay');
      expect(result.seen).toContain(publicChoice?'witnessPublicEcho':'witnessPrivateEcho');
      expect(result.seen).not.toContain(publicChoice?'witnessPrivateEcho':'witnessPublicEcho');
    }
  });
  it('declining early commitments removes unearned endings and survives a reload', () => {
    for (const [index, decision, blocked] of [[0,'witnessAttribution','witness'],[1,'embersPlan','relay'],[2,'departureAddress','departure']] as const) {
      const r = storyData.routes[index];
      const c = choose(investigated(),'finale',index);
      let s = read(c.state,c.next!).state;
      for (const step of r.steps) s = inspect(s,step.scene,step.event,{[decision]:1}).state;
      s = decodeSave(encodeSave(s,r.decision))!.state;
      expect(endingAvailable(s,blocked)).toBe(false);
      expect(r.endings.some(id=>endingAvailable(s,id))).toBe(true);
    }
  });
  it('returns through each reciprocal new doorway and highlights a valid event', () => {
    let s = investigated();
    for (const [from,to] of [['lane','courtyard'],['courtyard','warehouse'],['warehouse','waiting'],['waiting','river']] as const) {
      s=travel(s,from);s=travel(s,to);
      expect(eventIsAdjacent(to,from,s)).toBe(true);
      s=travel(s,from);expect(eventIsAdjacent(from,to,s)).toBe(true);
      expect(decodeSave(encodeSave(s,null))!.state).toEqual(s);
    }
  });
});
