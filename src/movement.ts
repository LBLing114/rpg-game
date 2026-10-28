import type { SceneId } from './types';
import type { Facing } from './characters';
import { TILE_SIZE as T, maps, getSpawn, groundPosition, eventPoint, interactionPoint, eventIsAdjacent, findPath, isWalkable, toTile, type Point } from './grid';

export const WALK_SPEED = 176;
const TURN_BUFFER_SECONDS = 0.2;
const directions: Record<string, Point> = {
  arrowleft:{x:-1,y:0}, a:{x:-1,y:0}, arrowright:{x:1,y:0}, d:{x:1,y:0},
  arrowup:{x:0,y:-1}, w:{x:0,y:-1}, arrowdown:{x:0,y:1}, s:{x:0,y:1},
};
export interface MovementTarget extends Point { done?: () => void }

/** Continuous motion along safe grid edges; only settled tiles enter a save. */
export class GridMovement {
  scene: SceneId = 'lane';
  x = getSpawn('lane').x;
  y = getSpawn('lane').y;
  keys = new Set<string>();
  enabled = true;
  facing: Facing = 'down';
  frame = 0;
  onPosition: (x:number,y:number) => void = () => {};
  protected rest: Point = getSpawn('lane');
  protected _target: MovementTarget | null = null;
  private path: Point[] = [];
  private step: Point | null = null;
  private edgeStart: Point = this.rest;
  private turn: { direction: Point; remaining: number } | null = null;
  get target() { return this._target; }
  set target(value: MovementTarget | null) { if (value === null) this.stop(); else this.move(value.x,value.y,value.done); }

  press(key:string) {
    const direction = directions[key];
    if (!direction || this.keys.has(key)) return;
    this.keys.add(key);
    this.turn = { direction, remaining: TURN_BUFFER_SECONDS };
  }
  release(key:string) { this.keys.delete(key); }
  clearInput() { this.keys.clear(); this.turn = null; }
  stop() {
    this._target = null; this.path = []; this.step = null; this.turn = null;
    this.x = this.rest.x; this.y = this.rest.y; this.frame = 0;
  }
  change(scene:SceneId,x?:number,y?:number,facing:Facing='up') {
    this.stop(); this.scene = scene;
    this.rest = x === undefined || y === undefined ? getSpawn(scene) : groundPosition(scene,x,y);
    this.x = this.rest.x; this.y = this.rest.y; this.clearInput(); this.facing = facing;
    this.onPosition(this.x,this.y);
  }
  move(x:number,y:number,done?:()=>void) {
    this.turn = null;
    const end = groundPosition(this.scene,x,y);
    // Keep the in-flight edge. Repeated clicks must never teleport backwards.
    if (this.step && end.x === this.edgeStart.x && end.y === this.edgeStart.y) this.reverse();
    const anchor = this.step ?? this.rest;
    const path = findPath(this.scene,anchor,end);
    if (!path.length && (anchor.x !== end.x || anchor.y !== end.y)) return;
    this.path = path; this._target = {...end,done};
    if (!this.step && !path.length) { this._target = null; done?.(); }
  }
  moveToEvent(id:string,done:()=>void=()=>{}) {
    if (!maps[this.scene].events[id]) return false;
    const end = interactionPoint(this.scene,id,this.step ?? this.rest);
    if (!eventIsAdjacent(this.scene,id,end)) return false;
    this.move(end.x,end.y,()=>{const p=eventPoint(this.scene,id);this.face(p.x-this.x,p.y-this.y);done();});
    return true;
  }
  nearestEvent():string|null {
    const current=toTile(this.rest),direction={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[this.facing];
    const entries=Object.entries(maps[this.scene].events).filter(([id])=>eventIsAdjacent(this.scene,id,this.rest));
    entries.sort(([,a],[,b])=>{const rank=(e:typeof a)=>e.col===current.col+direction[0]&&e.row===current.row+direction[1]?0:e.col===current.col&&e.row===current.row?1:2;return rank(a)-rank(b);});
    return entries[0]?.[0]??null;
  }
  private face(dx:number,dy:number) {
    if (Math.abs(dx)>Math.abs(dy)) this.facing=dx<0?'left':'right';
    else if(dy) this.facing=dy<0?'up':'down';
  }
  private inputDirection() {
    for (const key of [...this.keys].reverse()) if (directions[key]) return directions[key];
    return null;
  }
  private reverse() {
    if (!this.step) return;
    const previous = this.step; this.step = this.edgeStart; this.edgeStart = previous;
    this.face(this.step.x-this.x,this.step.y-this.y);
  }
  update(dt:number) {
    if (!this.enabled || dt <= 0 || !Number.isFinite(dt)) return;
    const input = this.inputDirection();
    const intent = this.turn?.direction ?? input;
    if (intent) {
      this.path=[]; this._target=null;
      if (this.step) {
        const dx=this.step.x-this.x,dy=this.step.y-this.y;
        // Reversing an already cleared edge is safe even between tile centres.
        if (dx*intent.x+dy*intent.y < 0) { this.reverse(); this.turn=null; }
      }
    }
    let budget=Math.min(dt,0.08)*WALK_SPEED;
    let moving=false;
    while (budget>0.000001 && this.enabled) {
      if (!this.step) {
        const direction=this.turn?.direction ?? input;
        this.turn=null;
        if (direction) {
          this.face(direction.x,direction.y);
          const tile=toTile(this.rest);
          if (isWalkable(this.scene,tile.col+direction.x,tile.row+direction.y))
            this.step={x:this.rest.x+direction.x*T,y:this.rest.y+direction.y*T};
        } else if(this.path.length) this.step=this.path.shift()!;
        if (!this.step) break;
        this.edgeStart={...this.rest};
        this.face(this.step.x-this.x,this.step.y-this.y);
      }
      const dx=this.step.x-this.x,dy=this.step.y-this.y;
      const distance=Math.abs(dx)+Math.abs(dy),amount=Math.min(distance,budget);
      this.x+=Math.sign(dx)*amount;this.y+=Math.sign(dy)*amount;
      budget-=amount;moving ||= amount>0;this.frame+=amount/WALK_SPEED*14;
      if (amount<distance) break;
      this.rest={...this.step};this.x=this.rest.x;this.y=this.rest.y;this.step=null;
      this.onPosition(this.x,this.y);
      if (!this.path.length && this._target) {
        const done=this._target.done;this._target=null;done?.();
        break; // A callback may change maps or open a dialogue.
      }
      // Carry this frame's remaining distance into the next tile, without a pause.
    }
    if (!moving) this.frame=0;
    if (this.turn) { this.turn.remaining-=dt; if(this.turn.remaining<=0)this.turn=null; }
  }
}
