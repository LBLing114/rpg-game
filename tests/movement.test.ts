import { describe, expect, it, vi } from 'vitest';
import { GridMovement, WALK_SPEED } from '../src/movement';
import { eventIsAdjacent, isWalkable, tileCenter, toTile } from '../src/grid';

function walker() {
  const player=new GridMovement();
  const p=tileCenter(8,12);player.change('lane',p.x,p.y);
  return player;
}
function frames(player:GridMovement,count:number,dt=1/60) { for(let i=0;i<count;i++)player.update(dt); }

describe('responsive movement along the collision grid',()=>{
  it.each([30,60,120])('starts on the next frame and keeps constant speed across tile boundaries at %s fps',fps=>{
    const player=walker(),start=player.x;
    player.press('d');player.update(1/fps);
    expect(player.x).toBeCloseTo(start+WALK_SPEED/fps,6);
    frames(player,fps-1,1/fps);
    expect(player.x).toBeCloseTo(start+WALK_SPEED,6);
  });
  it('consumes leftover distance at a tile boundary without a dead frame',()=>{
    const player=walker(),start=player.x;
    player.press('d');frames(player,10);
    const before=player.x;
    player.update(1/30);
    expect(before-start).toBeLessThan(32);
    expect(player.x-start).toBeGreaterThan(32);
    expect(player.x-before).toBeCloseTo(WALK_SPEED/30,6);
  });
  it('reverses immediately between centres, never teleporting or entering a blocked tile',()=>{
    const player=walker(),start=player.x;
    player.press('d');frames(player,7);
    const before=player.x;
    player.press('a');player.release('d');player.update(1/60);
    expect(player.x).toBeCloseTo(before-WALK_SPEED/60,6);
    expect(player.x).toBeGreaterThan(start);
    expect(player.facing).toBe('left');
    player.release('a');frames(player,15);
    expect(player.x).toBe(start);
  });
  it('buffers a short perpendicular tap until the next safe junction',()=>{
    const player=walker(),start={x:player.x,y:player.y};
    player.press('d');frames(player,5);player.release('d');
    player.press('w');player.release('w');frames(player,30);
    expect({x:player.x,y:player.y}).toEqual({x:start.x+32,y:start.y-32});
  });
  it('new mouse destinations do not snap back or call a superseded interaction',()=>{
    const player=walker(),old=vi.fn(),done=vi.fn();
    const far=tileCenter(15,12),near=tileCenter(12,12);
    player.move(far.x,far.y,old);frames(player,7);
    const before=player.x;
    player.move(near.x,near.y,done);
    expect(player.x).toBe(before);
    player.update(1/60);expect(player.x).toBeGreaterThan(before);
    frames(player,90);
    expect({x:player.x,y:player.y}).toEqual(near);
    expect(done).toHaveBeenCalledTimes(1);expect(old).not.toHaveBeenCalled();
  });
  it('keeps all committed positions walkable and prevents held movement through an NPC',()=>{
    const player=walker(),p=tileCenter(8,10),settled:{x:number;y:number}[]=[];
    player.change('lane',p.x,p.y);
    player.onPosition=(x,y)=>settled.push({x,y});
    player.press('w');frames(player,100);
    expect({x:player.x,y:player.y}).toEqual(p);
    expect(player.facing).toBe('up');
    player.clearInput();player.press('d');frames(player,60);
    expect(settled.length).toBeGreaterThan(4);
    for (const point of settled) {
      const tile=toTile(point);expect(isWalkable('lane',tile.col,tile.row)).toBe(true);
      expect(point.x%32).toBe(16);expect(point.y%32).toBe(16);
    }
  });
  it('completes a brief single step and cancels buffered movement when a menu or map opens',()=>{
    const player=walker(),start=player.x;
    player.press('d');frames(player,2);player.release('d');frames(player,20);
    expect(player.x).toBe(start+32);
    player.press('w');player.clearInput();player.stop();frames(player,30);
    expect(player.x).toBe(start+32);expect(player.y).toBe(tileCenter(8,12).y);
  });
  it('stops safely when an interaction opens a dialogue or changes the map',()=>{
    const player=walker();
    let calls=0;
    expect(player.moveToEvent('aunt',()=>{calls++;player.enabled=false;})).toBe(true);
    frames(player,300);
    expect(calls).toBe(1);expect(eventIsAdjacent('lane','aunt',player)).toBe(true);
    const point={x:player.x,y:player.y};frames(player,20);
    expect({x:player.x,y:player.y}).toEqual(point);
  });
});
