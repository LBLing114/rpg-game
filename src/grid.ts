import type { SceneId } from './types';

export const TILE_SIZE = 32;
export const WORLD_WIDTH = 768;
export const WORLD_HEIGHT = 512;
export const COLS = WORLD_WIDTH / TILE_SIZE;
export const ROWS = WORLD_HEIGHT / TILE_SIZE;
export interface Point { x: number; y: number }
export type PropKind = 'house' | 'desk' | 'shelf' | 'bed' | 'crate' | 'stove' | 'mirror' | 'press' | 'cabinet' | 'clock' | 'bench' | 'lamp' | 'poster' | 'bicycle' | 'boat' | 'rail' | 'curtain' | 'medical' | 'rug';
export interface MapProp { kind: PropKind; col: number; row: number; width: number; height: number; variant?: string; solid?: boolean }
export interface MapEvent { col: number; row: number; kind: 'person' | 'object' | 'exit'; actor?: string }
export interface GridMap { tiles: string[]; props: MapProp[]; events: Record<string, MapEvent>; spawn: { col: number; row: number }; outdoors: boolean }
const p = (kind: PropKind, col: number, row: number, width = 1, height = 1, variant?: string, solid = true): MapProp => ({ kind,col,row,width,height,variant,solid });
const e = (col:number,row:number,kind:MapEvent['kind'],actor?:string):MapEvent => ({col,row,kind,actor});
function interior(floor = '=') {
  return Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>{
    if (r===14 && c===11) return 'd';
    if (r>=4 && r<=13 && c>=2 && c<=21) return floor;
    if ((r>=2 && r<=3 && c>=1 && c<=22) || ((c===1 || c===22) && r>=4 && r<=14) || (r===14 && c>=2 && c<=21)) return '#';
    return ' ';
  }).join(''));
}
export const maps: Record<SceneId, GridMap> = {
  lane: {
    outdoors:true, spawn:{col:11,row:12},
    tiles:Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>r===0 || r===15 || c===0 || c===23 ? '#' : (c>=7&&c<=16 ? ',' : '.')).join('')),
    props:[
      p('house',1,1,6,5,'home'),p('house',9,1,6,5,'press'),p('house',17,1,6,5,'clinic'),
      p('house',1,8,5,4,'archive'),p('poster',18,7,1,1),p('bicycle',5,6,2,1),
      p('crate',19,10,1,1),p('crate',20,10,1,1),p('crate',20,9,1,1),
      p('lamp',7,7),p('lamp',17,11),p('bench',3,13,2,1),p('stove',2,6),
    ],
    events:{aunt:e(8,9,'person','aunt'),wall:e(18,7,'object'),home:e(3,5,'exit'),press:e(12,5,'exit'),clinic:e(20,5,'exit'),archive:e(3,11,'exit'),river:e(22,13,'exit')},
  },
  home: {
    outdoors:false,spawn:{col:11,row:12},tiles:interior(),
    props:[p('desk',5,7,3,2,'letter'),p('mirror',15,4),p('shelf',18,4,3,1),p('bed',17,10,3,3),p('crate',3,11,2,1),p('stove',3,5),p('rug',9,7,4,3,undefined,false),p('lamp',10,4),p('curtain',4,4,3,1,undefined,false)],
    events:{desk:e(6,8,'object'),mirror:e(15,4,'object'),lane:e(11,14,'exit')},
  },
  press: {
    outdoors:false,spawn:{col:11,row:12},tiles:interior(),
    props:[p('desk',5,5,3,1,'type'),p('press',8,8,3,2),p('shelf',16,4,4,1),p('desk',17,9,3,2,'paper'),p('crate',3,10,2,2),p('crate',5,11),p('lamp',12,4),p('poster',3,4)],
    events:{lin:e(14,8,'person','lin'),typecase:e(6,5,'object'),lane:e(11,14,'exit')},
  },
  clinic: {
    outdoors:false,spawn:{col:11,row:12},tiles:interior(':'),
    props:[p('medical',3,4,4,1),p('desk',5,8,3,2,'medicine'),p('bed',17,6,3,3,'clinic'),p('curtain',16,5,5,1,undefined,false),p('stove',3,12),p('bench',14,11,2,1),p('lamp',11,4),p('cabinet',19,11,2,1)],
    events:{doctor:e(8,7,'person','doctor'),gu:e(16,10,'person','gu'),register:e(5,4,'object'),lane:e(11,14,'exit')},
  },
  archive: {
    outdoors:false,spawn:{col:11,row:12},tiles:interior(),
    props:[p('shelf',3,4,4,1),p('shelf',10,4,4,1),p('shelf',17,4,4,1),p('shelf',4,8,3,1),p('shelf',17,8,3,1),p('desk',10,8,3,2,'register'),p('clock',8,4),p('crate',3,12,2,1),p('crate',19,12,2,1),p('lamp',15,6)],
    events:{cabinet:e(11,9,'object'),archiveWall:e(8,4,'object'),ledger:e(12,4,'object'),lane:e(11,14,'exit')},
  },
  river: {
    outdoors:true,spawn:{col:4,row:12},
    tiles:Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>r<7 ? '~' : r===7 && c>=16&&c<=19 ? 'p' : r===7 ? '~' : r===15 || c===0 || c===23 ? '#' : r<11 && c>=16 && c<=19 ? 'p' : '.').join('')),
    props:[p('boat',16,4,5,3),p('rail',1,8,7,1),p('rail',10,8,6,1),p('rail',20,8,3,1),p('lamp',5,10),p('lamp',14,10),p('bench',7,12,3,1),p('crate',20,12,2,1),p('crate',21,11),p('poster',2,9)],
    events:{finale:e(17,7,'exit'),water:e(9,8,'object'),lane:e(2,13,'exit')},
  },
};
export function tileCenter(col:number,row:number):Point { return {x:col*TILE_SIZE+TILE_SIZE/2,y:row*TILE_SIZE+TILE_SIZE/2}; }
export function toTile(point:Point) { return {col:Math.floor(point.x/TILE_SIZE),row:Math.floor(point.y/TILE_SIZE)}; }
export function isWalkable(scene:SceneId,col:number,row:number):boolean {
  const map=maps[scene],tile=map.tiles[row]?.[col];
  if (!tile || tile==='#' || tile===' ' || tile==='~') return false;
  if (map.props.some(p=>p.solid!==false && col>=p.col && col<p.col+p.width && row>=p.row && row<p.row+p.height)) return false;
  return !Object.values(map.events).some(e=>e.kind==='person' && e.col===col && e.row===row);
}
export function getSpawn(scene:SceneId):Point { const {col,row}=maps[scene].spawn; return tileCenter(col,row); }
export function groundPosition(scene:SceneId,x:number,y:number):Point {
  const safe=Number.isFinite(x)&&Number.isFinite(y)?{x,y}:getSpawn(scene);
  let result=getSpawn(scene),best=Infinity;
  for(let row=0;row<ROWS;row++) for(let col=0;col<COLS;col++) if(isWalkable(scene,col,row)){
    const point=tileCenter(col,row),distance=(point.x-safe.x)**2+(point.y-safe.y)**2;
    if(distance<best){best=distance;result=point;}
  }
  return result;
}
export function eventPoint(scene:SceneId,id:string):Point {
  const event=maps[scene].events[id];
  return event?tileCenter(event.col,event.row):getSpawn(scene);
}
const directions=[[0,1],[-1,0],[1,0],[0,-1]] as const;
/** Returns each cardinal step, excluding the starting tile. An unreachable tile returns no route. */
export function findPath(scene:SceneId,from:Point,to:Point):Point[] {
  const start=toTile(groundPosition(scene,from.x,from.y)),end=toTile(to);
  if(!isWalkable(scene,end.col,end.row)) return [];
  const index=(c:number,r:number)=>r*COLS+c;
  const a=index(start.col,start.row),b=index(end.col,end.row);
  if(a===b) return [];
  const previous=new Map<number,number>([[a,-1]]),queue=[a];
  for(let i=0;i<queue.length;i++){
    const current=queue[i],col=current%COLS,row=Math.floor(current/COLS);
    for(const [dx,dy] of directions){
      const c=col+dx,r=row+dy,k=index(c,r);
      if(!isWalkable(scene,c,r)||previous.has(k)) continue;
      previous.set(k,current);queue.push(k);
      if(k===b){
        const route:Point[]=[];
        for(let t=b;t!==a;t=previous.get(t)!) route.push(tileCenter(t%COLS,Math.floor(t/COLS)));
        return route.reverse();
      }
    }
  }
  return [];
}
/** Pick a reachable cardinal neighbor; doors may be reached on the door tile itself. */
export function interactionPoint(scene:SceneId,id:string,from=getSpawn(scene)):Point {
  const event=maps[scene].events[id];
  if(!event) return groundPosition(scene,from.x,from.y);
  const candidates=directions.map(([dx,dy])=>tileCenter(event.col+dx,event.row+dy));
  if(isWalkable(scene,event.col,event.row)) candidates.unshift(tileCenter(event.col,event.row));
  let result=groundPosition(scene,from.x,from.y),best=Infinity;
  for(const candidate of candidates){
    const tile=toTile(candidate);if(!isWalkable(scene,tile.col,tile.row)) continue;
    const path=findPath(scene,from,candidate);
    const same=from.x===candidate.x && from.y===candidate.y;
    if((path.length || same) && path.length<best){result=candidate;best=path.length;}
  }
  return result;
}
export function eventIsAdjacent(scene:SceneId,id:string,point:Point):boolean {
  const event=maps[scene].events[id];if(!event) return false;
  const tile=toTile(point);
  return Math.abs(event.col-tile.col)+Math.abs(event.row-tile.row)<=1;
}
