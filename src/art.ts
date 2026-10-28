import type { SceneId } from './types';
import { GridMovement } from './movement';
import { drawTitleBackground } from './title-art';
import { illustratedBuilding, illustratedProp, illustratedPortrait } from './illustrations';
import { drawCharacter, type Facing } from './characters';
import { drawGroundTile, drawRoomArchitecture, drawGroundDetails, drawCraftedProp } from './scenery';
export type { Facing } from './characters';
import { COLS, ROWS, TILE_SIZE as T, WORLD_WIDTH as W, WORLD_HEIGHT as H, maps, type MapProp } from './grid';

// Original atlas sprites and deterministic tile textures, rasterized on a 32px grid.
let ctx: CanvasRenderingContext2D;
let seed=1;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function line(x:number,y:number,x2:number,y2:number,color:string,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke();}
function poly(points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function glow(x:number,y:number,r:number,opacity=.2){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(238,183,91,${opacity})`);g.addColorStop(1,'rgba(238,183,91,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
function text(value:string,x:number,y:number,size=10,color='#d7caa6'){ctx.font=`${size}px "Noto Serif SC", serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(value,x,y);}
function tile(char:string,col:number,row:number){
  if(drawGroundTile(ctx,char,col,row))return;
  const x=col*T,y=row*T;
  if(char==='d'){
    rect(x,y,T,T,'#55594f');
    for(let i=0;i<T;i+=8){rect(x,y+i,T,2,'#b2ab91');rect(x,y+i+2,T,1,'#3d4743');}
  }else rect(x,y,T,T,'#11191e');
}
function windowAt(x:number,y:number,w=32,h=32,lit=false){
  rect(x-3,y-3,w+6,h+8,'#28312f');rect(x-2,y-3,w+4,3,'#8c8a75');
  rect(x,y,w,h,lit?'#ad915d':'#324548');
  rect(x+2,y+2,w-4,h-4,lit?'#dcc28b':'#4d6260');
  if(lit)rect(x+3,y+3,5,h-6,'#eee2ae');
  else for(let yy=5;yy<h-3;yy+=5)rect(x+3,y+yy,w-6,2,'#273f43');
  rect(x+w/2-1,y,2,h,'#343e38');rect(x,y+h/2,w,3,'#3c443a');
  rect(x-4,y+h,w+8,4,'#8b8d77');rect(x-3,y+h+4,w+7,2,'#222f2f');
}
function papers(x:number,y:number,w=30,h=40){
  rect(x+1,y+2,w,h,'#192b2d');rect(x,y,w,h,'#b7aa83');rect(x+2,y+3,w-4,4,'#865045');
  for(let yy=11;yy<h-4;yy+=5)for(let xx=3;xx<w-3;xx+=5)rect(x+xx,y+yy,2,3,'#656251');
  rect(x+w-5,y+h-7,5,7,'#6b6451');
}
function crate(x:number,y:number,w:number,h:number){
  rect(x+3,y+h-6,w-1,10,'#10202766');rect(x,y-8,w,h,'#514736');
  rect(x,y-8,w,10,'#89714e');rect(x+3,y-6,w-6,1,'#b39b6d');
  for(let yy=4;yy<h-8;yy+=8)rect(x+2,y+yy,w-4,2,'#302f26');
  rect(x+3,y+1,4,h-10,'#9b8058');rect(x+w-7,y+1,4,h-10,'#9b8058');
  line(x+7,y+2,x+w-7,y+h-11,'#756448',3);
}
function shelf(x:number,y:number,w:number,h:number,medical=false){
  const top=y-32;
  rect(x,top,w,h+28,'#342e29');rect(x,top,5,h+31,'#766347');rect(x+w-5,top,5,h+31,'#766347');rect(x-2,top-4,w+4,5,'#a18a60');
  for(let yy=top+3;yy<y+h-8;yy+=23){
    for(let xx=x+7;xx<x+w-8;xx+=medical?15:7){
      if(medical){rect(xx,yy+7,9,13,'#779482');rect(xx+2,yy+4,5,4,'#d8cba2');rect(xx+1,yy+13,7,4,'#c6c3a0');}
      else{const height=12+rnd()*6;rect(xx,yy+21-height,5,height,['#9c8661','#6f7870','#78614f','#a99e77','#5b6570'][Math.floor(rnd()*5)]);rect(xx+1,yy+11,3,1,'#c6ba924d');}
    }
    rect(x+4,yy+21,w-8,3,'#9b8058');rect(x+4,yy+24,w-8,2,'#302f29');
  }
  rect(x+4,y+h-5,w-8,4,'#9d855c');
}
function desk(x:number,y:number,w:number,h:number,variant?:string){
  rect(x+6,y+h-12,6,14,'#3e342d');rect(x+w-12,y+h-12,6,14,'#3e342d');
  rect(x,y-14,w,h-3,'#65513c');rect(x,y-14,w,h-13,'#9a8057');rect(x+3,y-12,w-6,2,'#c6aa77');
  for(let yy=y-5;yy<y+h-30;yy+=9)rect(x+3,yy,w-6,1,'#705a404d');
  rect(x,y+h-27,w,7,'#4a3e31');rect(x+3,y+h-25,w-6,1,'#b29666');
  if(variant==='type'){
    rect(x+7,y-9,w-14,24,'#393a32');for(let yy=0;yy<3;yy++)for(let xx=0;xx<Math.floor((w-20)/7);xx++){rect(x+11+xx*7,y-6+yy*7,5,5,'#a4a18b');rect(x+12+xx*7,y-4+yy*7,2,2,'#4e5b52');}
  }else{
    for(let i=0;i<(variant==='paper'?4:2);i++){rect(x+12+i*3,y-5-i*2,30,21,'#d6c8a0');for(let yy=0;yy<4;yy++)rect(x+17+i*3,y+i*-2+yy*3,19,1,'#7c795c');}
    rect(x+w-24,y-5,10,12,variant==='medicine'?'#779a8a':'#343b35');rect(x+w-23,y-7,8,3,'#ada37d');
    if(variant==='register'){rect(x+16,y-7,22,25,'#aa6854');rect(x+18,y-5,18,21,'#c3b992');rect(x+26,y-6,1,25,'#74664e');}
  }
}
function house(prop:MapProp,x:number,y:number,w:number,h:number){
  if(illustratedBuilding(ctx,prop.variant??'home',x-3,y-19,w+6,h+20)){
    if(prop.variant==='press'){
      rect(x+w*.33,y+h*.41,w*.35,13,'#2d292b');
      text('长 明 印 刷',x+w*.505,y+h*.41+10,9,'#ccae7e');
    }
    if(prop.variant==='archive'){
      rect(x+w*.30,y+h*.32,w*.42,14,'#9c8c72');
      text('档 案 室',x+w*.51,y+h*.32+11,10,'#39323a');
    }
    return;
  }

  // The roof occupies map tiles above a front-facing wall, just like a classic tileset.
  const facade=y+h-72,roofTop=y-25;
  rect(x+4,facade+7,w,h-facade+y-3,'#17252b');
  for(let row=0;row<3;row++)for(let col=0;col<Math.ceil(w/32);col++)tile('#',(x+col*32)/32,(facade+row*32)/32);
  rect(x,facade,w,72,'#62675c');
  for(let yy=facade;yy<y+h;yy+=8){rect(x,yy,w,1,'#3a4440');for(let xx=x+((yy-facade)%16?0:12);xx<x+w;xx+=24){rect(xx,yy,1,8,'#3c4540');rect(xx+2,yy+2,Math.min(18,x+w-xx-2),1,'#7c817063');}}
  rect(x+2,facade+3,7,69,'#8d8d77');rect(x+w-9,facade+3,7,69,'#8d8d77');
  const doorCol=prop.variant==='home'?2:prop.variant==='press'?3:prop.variant==='clinic'?3:2;
  const doorX=x+doorCol*T,doorW=28;
  rect(doorX-7,y+h-62,doorW+14,62,'#999982');rect(doorX-3,y+h-57,doorW+6,57,'#313b35');rect(doorX,y+h-53,doorW,53,'#403c31');
  rect(doorX+2,y+h-51,doorW-4,48,'#5b4e38');
  for(let xx=doorX+6;xx<doorX+doorW;xx+=7)rect(xx,y+h-49,1,46,'#282e29');
  rect(doorX+doorW/2,y+h-53,2,53,'#242d29');rect(doorX+10,y+h-24,2,5,'#cab879');
  rect(doorX-5,y+h-4,doorW+10,4,'#aeaa89');
  for(let xx=x+18;xx<x+w-28;xx+=48)if(Math.abs(xx-doorX)>25)windowAt(xx,facade+14,25,29,(xx/16)%3<2);
  // Sloping blue slate roof with repeated scalloped rows and pale ridge tiles.
  poly([[x-6,facade+1],[x+8,roofTop],[x+w-8,roofTop],[x+w+6,facade+1]],'#263b42');
  for(let yy=roofTop;yy<facade;yy+=10){
    const inset=Math.max(0,7-(yy-roofTop)*.14);
    for(let xx=x+inset;xx<x+w-inset;xx+=12){rect(xx,yy,10,8,'#485c60');rect(xx+1,yy,2,8,'#74847d');rect(xx+3,yy+1,5,4,'#5b6d6b');rect(xx,yy+8,11,2,'#1e333d');}
  }
  rect(x+6,roofTop-4,w-12,5,'#879082');rect(x+8,roofTop-4,w-16,2,'#b0af8c');
  rect(x-7,facade-1,w+14,5,'#24363b');rect(x-7,facade-1,w+14,1,'#a1a38a');
  rect(x-5,facade+4,w+10,4,'#101f27aa');
  const labels:Record<string,string>={home:'沈 家',press:'长 明 印 刷',clinic:'仁 安 诊 所',archive:'档 案 室'};
  const signW=prop.variant==='home'?48:82;
  rect(doorX+14-signW/2,y+h-72,signW,16,'#272f2b');rect(doorX+15-signW/2,y+h-71,signW-2,1,'#b3a582');
  text(labels[prop.variant??'home'],doorX+14,y+h-60,10);
  if(prop.variant==='clinic'){rect(x+w-29,facade+13,14,17,'#c0c1a1');rect(x+w-24,facade+16,4,11,'#985b4d');rect(x+w-28,facade+20,12,4,'#985b4d');}
}
function drawProp(prop:MapProp,scene:SceneId){
  if(drawCraftedProp(ctx,prop,scene))return;
  const x=prop.col*T,y=prop.row*T,w=prop.width*T,h=prop.height*T;
  // Atlas assets share the same footline as their collision rectangles.
  // Tall objects extend upward, so the existing Y-sort also covers their artwork.
  let painted=false;
  switch(prop.kind){
    case 'desk': painted=illustratedProp(ctx,'desk',x-1,y-17,w+2,h+18);break;
    case 'bed': painted=illustratedProp(ctx,'bed',x+w*.12,y-24,w*.76,h+24);break;
    case 'shelf': {
      // Repeat complete bays instead of stretching one bookcase across the wall.
      const bays=Math.max(1,Math.ceil(w/100)),bay=w/bays;
      for(let i=0;i<bays;i++)painted=illustratedProp(ctx,'shelf',x+i*bay,y-47,bay,h+47);
      break;
    }
    case 'medical':
      for(let i=0;i<2;i++)painted=illustratedProp(ctx,'medical',x+i*w/2+3,y-43,w/2-6,h+43);
      break;
    case 'crate': painted=illustratedProp(ctx,'crate',x,y-10,w,h+10);break;
    case 'press': painted=illustratedProp(ctx,'press',x-7,y-30,w+14,h+30);break;
    case 'bench': painted=illustratedProp(ctx,'bench',x,y-14,w,h+14);break;
    case 'lamp': painted=illustratedProp(ctx,'lamp',x+5,y-67,24,99);break;
    case 'stove': painted=illustratedProp(ctx,'stove',x,y-33,w,h+33);break;
    case 'bicycle': painted=illustratedProp(ctx,'bicycle',x-4,y-14,w+8,46);break;
    case 'boat': painted=illustratedProp(ctx,'boat',x+w*.25,y-62,w*.5,h+62);break;
  }
  if(painted){
    if(prop.kind==='desk' && prop.variant==='register'){
      rect(x+w*.34,y+h*.1,14,19,'#594040');rect(x+w*.34+2,y+h*.1+2,10,15,'#b2a584');
      for(let i=0;i<4;i++)rect(x+w*.34+4,y+h*.1+4+i*3,6,1,'#5e5849');
    }
    return;
  }
  switch(prop.kind){
    case 'house': house(prop,x,y,w,h);break;
    case 'desk': desk(x+2,y,w-4,h,prop.variant);break;
    case 'shelf': shelf(x+2,y,w-4,h);break;
    case 'medical': shelf(x+2,y,w-4,h,true);break;
    case 'crate': crate(x+2,y,w-4,h);break;
    case 'bed':
      rect(x+4,y-12,w-8,h+10,'#3b4136');rect(x+1,y-15,5,h+17,'#a29c7e');rect(x+w-6,y-15,5,h+17,'#a29c7e');
      rect(x+7,y-9,w-14,h-6,'#b4b19b');rect(x+12,y-5,w-24,20,'#d9d0b1');rect(x+14,y-2,w-28,2,'#efe4c2');
      rect(x+8,y+20,w-16,h-33,prop.variant==='clinic'?'#97a394':'#737d70');
      for(let yy=y+24;yy<y+h-14;yy+=8)rect(x+9,yy,w-18,2,prop.variant==='clinic'?'#bac0a6':'#98a18a');rect(x+1,y+h-9,w-2,8,'#7d8069');break;
    case 'mirror':
      rect(x+3,y-38,26,65,'#483e33');rect(x+5,y-36,22,61,'#baa97e');rect(x+8,y-33,16,54,'#6f8984');rect(x+9,y-31,7,51,'#90a197');
      line(x+17,y-33,x+12,y-10,'#d0d3b1');line(x+12,y-10,x+21,y+12,'#2d464b');line(x+12,y-10,x+8,y+5,'#c8cbb0');break;
    case 'stove':
      rect(x+5,y-10,22,37,'#343d3c');rect(x+3,y-12,26,5,'#8b8f79');rect(x+9,y+3,14,15,'#212c2a');rect(x+11,y+6,10,8,'#bc7947');rect(x+14,y+9,4,4,'#eac586');rect(x+22,y-48,5,36,'#535f59');rect(x+23,y-48,1,36,'#9a9c82');rect(x+8,y+26,4,5,'#242e2d');rect(x+22,y+26,4,5,'#242e2d');break;
    case 'press':
      rect(x+10,y-6,w-20,h,'#293a3e');rect(x+12,y-6,w-24,7,'#7e8b80');rect(x+18,y+8,w-36,19,'#89958a');rect(x+20,y+11,w-40,11,'#b7baa0');rect(x+17,y+33,w-34,16,'#3d514f');rect(x+13,y+50,7,11,'#1e2b31');rect(x+w-20,y+50,7,11,'#1e2b31');
      rect(x+w/2-6,y-35,12,30,'#5d706a');rect(x+16,y-36,w-32,7,'#a4ac92');
      ctx.strokeStyle='#899d8d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+7,y+15,19,0,Math.PI*2);ctx.stroke();for(let a=0;a<6;a++)line(x+7,y+15,x+7+Math.cos(a)*17,y+15+Math.sin(a)*17,'#849b8d',2);break;
    case 'bench':
      rect(x+3,y-11,w-6,11,'#7e6445');rect(x+3,y-9,w-6,2,'#b39a6e');rect(x+2,y+7,w-4,10,'#9a7c53');rect(x+2,y+9,w-4,1,'#c5a575');rect(x+7,y+18,5,9,'#4b4135');rect(x+w-12,y+18,5,9,'#4b4135');break;
    case 'lamp':
      rect(x+14,y-52,4,76,'#243238');rect(x+15,y-52,1,76,'#7b887a');rect(x+10,y+23,12,5,'#354b49');rect(x+8,y-58,16,22,'#c5ab69');rect(x+10,y-56,12,17,'#f0d795');rect(x+14,y-57,3,20,'#9f8c56');rect(x+6,y-61,20,4,'#2d3e40');rect(x+6,y-37,20,4,'#2d3e40');poly([[x+6,y-62],[x+16,y-69],[x+26,y-62]],'#5c7169');break;
    case 'poster': papers(x+2,y-18,28,47);rect(x,y+27,32,5,'#364443');break;
    case 'bicycle':
      ctx.strokeStyle='#1d3036';ctx.lineWidth=3;for(const xx of[x+12,x+w-13]){ctx.beginPath();ctx.arc(xx,y+17,11,0,Math.PI*2);ctx.stroke();}
      line(x+12,y+17,x+25,y-7,'#9c9e80',2);line(x+12,y+17,x+36,y+17,'#9c9e80',2);line(x+25,y-7,x+36,y+17,'#9c9e80',2);line(x+36,y+17,x+43,y-9,'#9c9e80',2);line(x+43,y-9,x+w-13,y+17,'#9c9e80',2);rect(x+18,y-10,15,4,'#202d31');line(x+43,y-9,x+36,y-14,'#b0ad89',2);break;
    case 'boat':
      poly([[x-10,y+5],[x+w+4,y+5],[x+w-12,y+h-7],[x+13,y+h-7]],'#1a2f37');rect(x+5,y+4,w-10,h-27,'#7b7356');for(let yy=y+12;yy<y+h-25;yy+=8)rect(x+10,yy,w-20,2,'#4c5141');rect(x+21,y-21,w-42,41,'#6f7970');rect(x+17,y-24,w-34,8,'#b1ad87');windowAt(x+31,y-15,24,21,true);windowAt(x+w-58,y-15,24,21,true);rect(x+w/2-5,y-43,10,19,'#364a49');rect(x+w/2-7,y-44,14,3,'#708077');break;

  }
}
function background(scene:SceneId):HTMLCanvasElement{
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;seed=42+scene.length;
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)tile(maps[scene].tiles[row][col],col,row);
  if(!maps[scene].outdoors)drawRoomArchitecture(ctx,scene);
  for(const prop of maps[scene].props){
    if(prop.kind==='rug'){drawProp(prop,scene);continue;}
    rect(prop.col*T+5,(prop.row+prop.height)*T-3,prop.width*T-10,5,'#10202835');
  }
  drawGroundDetails(ctx,scene);
  if(scene==='lane'){text('黄 浦 江 →',680,451,11,'#b3b18c');text('← 后 弄',65,253,10,'#b3b18c');}
  if(scene==='courtyard'){text('货 栈 ←',71,428,10);text('→ 槐 生 里',668,428,10);}
  if(scene==='warehouse')text('候 船 室 →',663,433,10);
  if(scene==='waiting')text('江 岸 →',663,432,10);
  if(scene==='river')text('← 槐 生 里',98,466,11,'#c0b68e');
  return canvas;
}
export function drawPerson(c:CanvasRenderingContext2D,x:number,y:number,type='shen',frame=0,facing:Facing|number='down',scale=1){
  c.save();c.translate(x,y);c.scale(scale,scale);
  drawCharacter(c,0,0,type,frame,typeof facing==='number'?(facing<0?'left':'down'):facing);
  c.restore();
}
const personColors:Record<string,{coat:string;hair:string;skin:string}>={
  shen:{coat:'#34465b',hair:'#242e35',skin:'#ccb292'},aunt:{coat:'#705368',hair:'#b4b6a3',skin:'#bfa287'},
  lin:{coat:'#737d68',hair:'#302f2c',skin:'#dfc29f'},doctor:{coat:'#c1c6af',hair:'#424039',skin:'#cfb390'},gu:{coat:'#78614d',hair:'#ada995',skin:'#bfa385'},
};
export function drawPortrait(c:CanvasRenderingContext2D,type='shen',width=c.canvas.width,height=c.canvas.height){
  c.clearRect(0,0,width,height);
  delete c.canvas.dataset.illustration;
  delete c.canvas.dataset.artReady;
  // Environmental narration has no character portrait, including while art loads.
  if(!Object.hasOwn(personColors,type)) return;
  if(illustratedPortrait(c,type)) return;
  const off=document.createElement('canvas');off.width=64;off.height=72;const previous=ctx;ctx=off.getContext('2d')!;
  const palette=personColors[type]??personColors.shen;
  rect(0,0,64,72,'#29373c');for(let y=0;y<72;y+=4)rect(0,y,64,1,'#78847a12');
  poly([[4,72],[10,51],[23,43],[42,43],[56,52],[62,72]],'#1b2a32');poly([[7,72],[13,53],[24,46],[42,46],[53,54],[58,72]],palette.coat);
  rect(25,39,15,15,palette.skin);rect(27,43,13,8,'#aa896f');
  rect(17,13,31,29,palette.hair);rect(14,20,36,15,palette.hair);rect(20,23,25,24,palette.skin);rect(17,28,4,11,palette.skin);rect(44,28,4,10,palette.skin);
  rect(20,40,4,4,'#b2947b');rect(39,40,5,4,'#b2947b');rect(26,46,12,3,'#b6977c');rect(22,20,21,8,palette.skin);
  rect(17,14,29,9,palette.hair);rect(17,20,6,13,palette.hair);rect(40,19,7,14,palette.hair);rect(24,10,16,5,palette.hair);rect(19,14,12,2,type==='aunt'||type==='gu'?'#d2cbb3':'#52615c');
  rect(23,29,6,2,'#605244');rect(35,29,6,2,'#605244');rect(25,32,3,3,'#26343a');rect(36,32,3,3,'#26343a');rect(31,34,2,5,'#b08c70');rect(28,41,9,1,'#865f50');
  if(type==='shen'){poly([[21,48],[31,53],[45,48],[44,55],[32,58],[20,53]],'#c7b58b');rect(37,54,7,18,'#b7a47d');rect(15,55,3,17,'#8d9e98');}
  if(type==='aunt'){rect(23,8,17,6,'#b4b8a5');poly([[20,50],[29,56],[43,51],[45,72],[19,72]],'#a69c85');}
  if(type==='doctor'){rect(19,11,26,7,'#dfdec0');rect(29,11,5,6,'#9c6454');poly([[22,49],[31,58],[28,71],[16,55]],'#e0ddbe');poly([[41,49],[32,58],[36,71],[49,55]],'#e0ddbe');}
  if(type==='gu'){rect(21,30,10,7,'#706d5d');rect(34,30,10,7,'#706d5d');rect(23,32,6,3,'#c6c2a2');rect(36,32,6,3,'#c6c2a2');rect(31,32,3,1,'#514f43');rect(29,40,8,2,'#c8c2a7');}
  if(type==='lin'){rect(41,24,6,27,palette.hair);rect(42,47,5,3,'#a38569');rect(30,53,3,19,'#cad0ae');}
  ctx=previous;c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);c.drawImage(off,0,0,width,height);
}

interface PropSprite {canvas:HTMLCanvasElement;x:number;y:number;depth:number}
export class World extends GridMovement {
  canvas:HTMLCanvasElement;context:CanvasRenderingContext2D;
  titleMode=false;motion=true;last=0;animation=0;
  backgrounds=new Map<SceneId,HTMLCanvasElement>();private sprites=new Map<SceneId,PropSprite[]>();
  constructor(canvas:HTMLCanvasElement){super();this.canvas=canvas;canvas.width=W;canvas.height=H;this.context=canvas.getContext('2d')!;this.context.imageSmoothingEnabled=false;this.render=this.render.bind(this);this.animation=requestAnimationFrame(this.render);}
  override change(scene:SceneId,x?:number,y?:number,facing:Facing='up'){super.change(scene,x,y,facing);this.syncPosition();}
  private propSprites():PropSprite[]{
    if(this.sprites.has(this.scene))return this.sprites.get(this.scene)!;
    const result=maps[this.scene].props.filter(p=>p.kind!=='rug').map(prop=>{
      const canvas=document.createElement('canvas'),x=prop.col*T-24,y=prop.row*T-80;
      canvas.width=prop.width*T+48;canvas.height=prop.height*T+100;
      ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.translate(-x,-y);seed=prop.col*71+prop.row*19;drawProp(prop,this.scene);
      return {canvas,x,y,depth:(prop.row+prop.height)*T-8};
    });this.sprites.set(this.scene,result);return result;
  }
  private syncPosition(){for(const [key,value] of Object.entries({playerX:String(this.rest.x),playerY:String(this.rest.y),facing:this.facing}))if(this.canvas.dataset[key]!==value)this.canvas.dataset[key]=value;}
  invalidateArt(){this.backgrounds.clear();this.sprites.clear();this.canvas.dataset.artReady='true';}
  background(){if(!this.backgrounds.has(this.scene))this.backgrounds.set(this.scene,background(this.scene));return this.backgrounds.get(this.scene)!;}
  render(time:number){
    const dt=Math.min(Math.max((time-this.last)/1000,0),.08);this.last=time;this.update(dt);this.syncPosition();
    const c=this.context;c.clearRect(0,0,W,H);
    if(this.titleMode){
      drawTitleBackground(c,time,this.motion);
      this.animation=requestAnimationFrame(this.render);
      return;
    }
    c.drawImage(this.background(),0,0);
    const layers:{depth:number;draw:()=>void}[]=this.propSprites().map(p=>({depth:p.depth,draw:()=>c.drawImage(p.canvas,p.x,p.y)}));
    if(!this.titleMode){
      for(const event of Object.values(maps[this.scene].events))if(event.kind==='person'){const point={x:event.col*T+T/2,y:event.row*T+T/2};layers.push({depth:point.y,draw:()=>drawPerson(c,point.x,point.y,event.actor,0,'down')});}
      layers.push({depth:this.y,draw:()=>drawPerson(c,this.x,this.y,'shen',this.motion?this.frame:0,this.facing)});
    }
    layers.sort((a,b)=>a.depth-b.depth);for(const layer of layers)layer.draw();ctx=c;
    for(const prop of maps[this.scene].props)if(prop.kind==='lamp')glow(prop.col*T+16,prop.row*T-48,95,.14);
    // Warmth comes from practical lamps; avoid a flat orange wash over the room.
    if(!maps[this.scene].outdoors){glow(253,137,77,.08);glow(511,137,70,.06);}
    // Subtle night tint preserves the readable pixel palette and warm lamps.
    rect(0,0,W,H,maps[this.scene].outdoors?'#2535430b':'#322e2505');
    const vignette=c.createRadialGradient(W/2,H/2,180,W/2,H/2,485);vignette.addColorStop(0,'#07131e00');vignette.addColorStop(1,'#101c2942');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    if(!this.titleMode)poly([[this.x-3,this.y-51],[this.x+3,this.y-51],[this.x,this.y-47]],'#e8d5a1');
    if(this._target){c.strokeStyle='#e0cf9eaa';c.lineWidth=1;c.strokeRect(this._target.x-10,this._target.y-7,20,14);rect(this._target.x-1,this._target.y-1,3,3,'#e0cf9e');}
    if(maps[this.scene].outdoors&&this.motion){
      for(let i=0;i<50;i++){const x=(i*83+time*.019)%W,y=(i*53+time*.16)%H;line(x,y,x-2,y+7,'#afc0c21c');}
      for(let i=0;i<10;i++){const phase=(time*.0006+i*.17)%1;c.strokeStyle=`rgba(166,193,186,${(1-phase)*.12})`;c.strokeRect(220+(i*61)%400,230+(i*37)%240,phase*12+2,phase*4+1);}
    }
    this.animation=requestAnimationFrame(this.render);
  }
}
