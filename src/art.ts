import type { SceneId } from './types';
import { COLS, ROWS, TILE_SIZE as T, WORLD_WIDTH as W, WORLD_HEIGHT as H, maps, getSpawn, groundPosition, eventPoint, interactionPoint, eventIsAdjacent, findPath, isWalkable, toTile, type MapProp, type Point } from './grid';

// Original, deterministic pixel artwork. Everything is painted locally; no asset downloads.
let ctx: CanvasRenderingContext2D;
let seed=1;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function line(x:number,y:number,x2:number,y2:number,color:string,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke();}
function poly(points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function glow(x:number,y:number,r:number,opacity=.2){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(238,183,91,${opacity})`);g.addColorStop(1,'rgba(238,183,91,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
function text(value:string,x:number,y:number,size=10,color='#d7caa6'){ctx.font=`${size}px "Noto Serif SC", serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(value,x,y);}
function stone(x:number,y:number,variant:number){
  rect(x,y,T,T,['#525858','#555b5a','#4c5353'][variant%3]);
  rect(x,y,T,1,'#303a3c');rect(x,y,1,T,'#303a3c');
  rect(x+2,y+2,T-4,1,'#72766c');rect(x+2,y+3,1,T-5,'#626b64');
  for(let i=0;i<7;i++)rect(x+3+rnd()*25,y+4+rnd()*25,1+rnd()*3,1,rnd()>.5?'#83857936':'#1a303145');
  if(variant%7===0){line(x+4,y+18,x+13,y+15,'#344346');line(x+13,y+15,x+20,y+22,'#344346');}
}
function tile(char:string,col:number,row:number){
  const x=col*T,y=row*T,v=(col*31+row*17)%11;
  if(char===' '){rect(x,y,T,T,'#10191b');return;}
  if(char==='#'){
    rect(x,y,T,T,'#363e3e');
    for(let yy=0;yy<T;yy+=8){rect(x,y+yy,T,1,'#222c30');for(let xx=(yy%16?0:-16);xx<T;xx+=16){rect(x+Math.max(0,xx),y+yy+1,1,7,'#252f31');rect(x+Math.max(1,xx+2),y+yy+2,Math.min(13,T-Math.max(1,xx+2)),1,'#5b6259');}}
    return;
  }
  if(char==='~'){
    rect(x,y,T,T,['#263f45','#294249','#2c464b'][v%3]);
    for(let i=0;i<5;i++)rect(x+rnd()*20,y+rnd()*30,4+rnd()*9,1,i%2?'#69817d40':'#132e3655');
    return;
  }
  if(char==='='||char==='p'){
    rect(x,y,T,T,char==='='?'#75624e':'#686553');
    for(let yy=0;yy<32;yy+=8){rect(x,y+yy,32,1,'#382f2b');rect(x,y+yy+1,32,1,'#a08c633d');rect(x+3+rnd()*9,y+yy+5,8+rnd()*15,1,'#413d313b');}
    rect(x,y+(v%3)*8,1,8,'#302e2a');rect(x+16,y+((v+1)%4)*8,1,8,'#3a302b');
    if(char==='p'){rect(x+3,y+3,2,2,'#323a35');rect(x+27,y+27,2,2,'#323a35');}
    return;
  }
  if(char===':'){
    rect(x,y,T,T,'#858576');
    for(let yy=0;yy<32;yy+=16)for(let xx=0;xx<32;xx+=16){rect(x+xx,y+yy,15,15,(xx+yy+col*16)%32?'#717b73':'#979b85');rect(x+xx+2,y+yy+2,11,1,'#b1b09a33');}
    return;
  }
  if(char===','){
    rect(x,y,T,T,['#3f4b4e','#414d50','#3b484c'][v%3]);
    for(let i=0;i<18;i++)rect(x+rnd()*32,y+rnd()*32,1+rnd()*2,1,rnd()>.6?'#86958a30':'#172c3355');
    if(v===2||v===8){rect(x+3,y+18,24,6,'#273b43');rect(x+8,y+18,14,1,'#8d9b8b47');}
    return;
  }
  if(char==='d'){rect(x,y,T,T,'#655b49');for(let i=0;i<32;i+=8)rect(x,y+i,32,2,'#a09271');return;}
  stone(x,y,v);
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
function drawProp(prop:MapProp){
  const x=prop.col*T,y=prop.row*T,w=prop.width*T,h=prop.height*T;
  switch(prop.kind){
    case 'house': house(prop,x,y,w,h);break;
    case 'desk': desk(x+2,y,w-4,h,prop.variant);break;
    case 'shelf': shelf(x+2,y,w-4,h);break;
    case 'medical': shelf(x+2,y,w-4,h,true);break;
    case 'crate': crate(x+2,y,w-4,h);break;
    case 'cabinet':
      rect(x+2,y-25,w-4,h+22,'#596764');rect(x+3,y-25,w-6,3,'#a0a690');
      for(let yy=y-19;yy<y+h-7;yy+=17){rect(x+5,yy,w-10,15,'#7b8270');rect(x+w/2-6,yy+5,12,3,'#2c3c3c');rect(x+w/2-4,yy+5,8,1,'#c0c0a0');}break;
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
    case 'clock':
      rect(x+3,y-31,26,50,'#564a35');rect(x+5,y-29,22,29,'#b8b393');rect(x+7,y-27,18,25,'#e1d6ad');line(x+16,y-15,x+16,y-24,'#574f3b',2);line(x+16,y-15,x+22,y-12,'#574f3b',2);rect(x+9,y+3,14,12,'#2c3530');rect(x+15,y+3,2,10,'#b39a62');break;
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
    case 'rail':
      rect(x,y-4,w,4,'#a8aa8a');rect(x,y+12,w,3,'#5f766c');for(let xx=x+4;xx<x+w;xx+=32){rect(xx,y-13,6,39,'#7e8f7c');rect(xx-2,y-15,10,4,'#c5bea0');rect(xx+1,y-10,1,32,'#b2b69b');}break;
    case 'curtain':
      rect(x,y-33,w,3,'#b2aa88');for(let xx=0;xx<w;xx+=8){rect(x+xx,y-30,7,27,'#879589');rect(x+xx+1,y-30,2,25,'#acb39b');}break;
    case 'rug':
      rect(x+4,y+4,w-8,h-8,'#645344');rect(x+7,y+7,w-14,h-14,'#7c6751');for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#b3a17c55':'#353b3433';ctx.strokeRect(x+12+i*5,y+12+i*5,w-24-i*10,h-24-i*10);}break;
  }
}
function background(scene:SceneId):HTMLCanvasElement{
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;seed=42+scene.length;
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)tile(maps[scene].tiles[row][col],col,row);
  if(!maps[scene].outdoors){
    // Cutaway perimeter: a two-tile high back wall, side caps and a door at the south edge.
    rect(32,63,704,5,'#c0b592');rect(35,68,698,4,'#3b3c33');rect(64,121,640,7,'#9b967a');rect(64,127,640,4,'#323b35');
    rect(32,128,6,352,'#b0a98b');rect(730,128,6,352,'#b0a98b');
    rect(32,447,320,5,'#b0a98b');rect(384,447,352,5,'#b0a98b');
    windowAt(232,78,43,34,true);windowAt(490,78,43,34,scene==='home');
    for(const x of[64,352,696]){rect(x,73,5,53,'#373d34');rect(x+1,73,1,53,'#91917a');}
    const labels:Record<string,string>={home:'沈 宅 · 一 九 六 八',press:'长 明 印 刷',clinic:'仁 安 诊 所',archive:'档 案 · 值 班 室'};
    text(labels[scene],384,97,13,'#b8ad87');
    // Shadows cast by the back wall and the window light on the wooden floor.
    rect(64,131,640,8,'#101b2340');rect(64,139,640,6,'#101b2322');
    poly([[234,132],[274,132],[318,226],[260,226]],'#e8d4960e');
  }
  for(const prop of maps[scene].props){
    if(prop.kind==='rug'){drawProp(prop);continue;}
    rect(prop.col*T+4,(prop.row+prop.height)*T-8,prop.width*T+6,13,'#10202845');
  }
  if(scene==='lane'){
    // Cobbled gutters, drains, road repairs and a few fallen paper scraps.
    for(const col of[6,17])for(let row=6;row<15;row++){rect(col*T+25,row*T,7,32,'#1c323b');rect(col*T+25,row*T,1,32,'#98a38c55');}
    for(const [col,row] of[[10,7],[13,13],[15,10]]){rect(col*T,row*T+8,27,13,'#22373b');for(let x=3;x<27;x+=5)rect(col*T+x,row*T+9,2,10,'#6e7d73');}
    for(let i=0;i<14;i++)rect(220+rnd()*320,220+rnd()*240,3+rnd()*5,2,'#a99b714d');
    text('黄 浦 江  →',680,451,12,'#b3b18c');
  }
  if(scene==='river'){
    // A top-down expanse of dark water; distant lights are only reflections, no horizon.
    for(let i=0;i<90;i++)rect(510+rnd()*90,rnd()*100,2+rnd()*7,1,'#b7ab6b30');
    for(let row=8;row<15;row++)rect(32,row*T+30,704,2,'#303e40');
    text('← 槐 生 里',98,466,12,'#c0b68e');
  }
  return canvas;
}
export type Facing='down'|'up'|'left'|'right';
const personColors:Record<string,{coat:string;light:string;hair:string;skin:string}>={
  shen:{coat:'#5c6b70',light:'#91a19a',hair:'#242e35',skin:'#ccb292'},
  aunt:{coat:'#605874',light:'#8c7c91',hair:'#b4b6a3',skin:'#bfa287'},
  lin:{coat:'#737d68',light:'#a1ae8b',hair:'#302f2c',skin:'#dfc29f'},
  doctor:{coat:'#c1c6af',light:'#e1dfc2',hair:'#424039',skin:'#cfb390'},
  gu:{coat:'#78614d',light:'#a78b61',hair:'#ada995',skin:'#bfa385'},
};
export function drawPerson(c:CanvasRenderingContext2D,x:number,y:number,type='shen',frame=0,facing:Facing|number='down',scale=1){
  const previous=ctx;ctx=c;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
  const f=typeof facing==='number'?(facing<0?'left':'down'):facing,colors=personColors[type]??personColors.shen;
  const stride=frame>0?Math.sin(frame)*2:0,bob=frame>0?Math.round(Math.sin(frame*2)*.7):0;
  rect(-10,-1,20,4,'#0e1e2670');rect(-7,2,14,2,'#0e1e2630');
  rect(-7,-8+stride,6,9,'#202c34');rect(2,-8-stride,6,9,'#202c34');rect(-8,-1+stride,7,3,'#a4a48b');rect(2,-1-stride,7,3,'#8b9586');
  ctx.translate(0,bob);rect(-10,-27,20,22,'#28363c');rect(-8,-26,16,20,colors.coat);rect(-7,-25,2,15,colors.light);
  rect(-12,-24-stride*.4,4,16,colors.coat);rect(9,-24+stride*.4,4,16,colors.coat);rect(-11,-10-stride*.4,3,4,colors.skin);rect(9,-10+stride*.4,3,4,colors.skin);
  rect(-10,-42,20,17,colors.hair);rect(-12,-38,24,10,colors.hair);rect(-8,-35,16,13,colors.skin);rect(-9,-36,18,6,colors.skin);
  if(f==='up'){
    rect(-10,-41,20,17,colors.hair);rect(-7,-27,14,3,colors.hair);rect(-7,-39,10,2,type==='aunt'||type==='gu'?'#d3cbb0':'#51605c');
  }else if(f==='left'||f==='right'){
    const side=f==='left'?-1:1;rect(side<0?-11:4,-39,7,14,colors.hair);rect(side<0?-12:9,-30,3,5,colors.skin);rect(side<0?-8:6,-33,2,3,'#20282b');rect(side<0?-5:-7,-41,12,8,colors.hair);rect(side<0?5:-8,-34,3,5,'#ae8e71');
  }else{
    rect(-9,-40,18,8,colors.hair);rect(-9,-34,4,6,colors.hair);rect(6,-35,3,6,colors.hair);rect(-5,-32,2,3,'#252d30');rect(4,-32,2,3,'#252d30');rect(-1,-27,3,1,'#98765e');rect(-6,-35,4,1,'#332f2b');rect(3,-35,4,1,'#332f2b');
  }
  if(type==='shen'){rect(-8,-25,15,4,'#b7a880');rect(4,-22,4,12,'#b7a880');rect(-9,-17,5,11,'#4b4236');}
  if(type==='aunt'){rect(-6,-44,11,5,'#9a9f91');rect(-6,-21,12,14,'#a59c86');}
  if(type==='doctor'){rect(-8,-43,16,6,'#dfdfc1');rect(-1,-23,2,13,'#4a5b58');}
  if(type==='gu'&&f!=='up'){rect(-8,-33,6,5,'#6a6659');rect(2,-33,6,5,'#6a6659');rect(-6,-32,3,2,'#c5bb96');rect(3,-32,3,2,'#c5bb96');rect(-2,-32,4,1,'#373934');}
  ctx.restore();ctx=previous;
}
export function drawPortrait(c:CanvasRenderingContext2D,type='shen',width=c.canvas.width,height=c.canvas.height){
  const off=document.createElement('canvas');off.width=64;off.height=72;const previous=ctx;ctx=off.getContext('2d')!;
  const palette=personColors[type]??personColors.shen;
  rect(0,0,64,72,'#29373c');for(let y=0;y<72;y+=4)rect(0,y,64,1,'#78847a12');
  if(type==='narrator'){
    rect(0,45,64,27,'#3f5355');for(let i=0;i<8;i++)rect(i*9,53+(i%3)*5,14,1,'#82978a');poly([[10,40],[34,25],[53,40],[42,48],[20,48]],'#c4b68d');poly([[23,39],[33,18],[34,39]],'#e8d9aa');line(33,20,34,43,'#7c8067');
  }else{
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
  }
  ctx=previous;c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);c.drawImage(off,0,0,width,height);
}

interface MovementTarget extends Point { done?:()=>void }
interface PropSprite {canvas:HTMLCanvasElement;x:number;y:number;depth:number}
export class World{
  canvas:HTMLCanvasElement;context:CanvasRenderingContext2D;scene:SceneId='lane';
  x=getSpawn('lane').x;y=getSpawn('lane').y;keys=new Set<string>();enabled=true;motion=true;last=0;frame=0;facing:Facing='down';animation=0;
  onPosition:(x:number,y:number)=>void=()=>{};
  backgrounds=new Map<SceneId,HTMLCanvasElement>();private sprites=new Map<SceneId,PropSprite[]>();
  private _target:MovementTarget|null=null;private path:Point[]=[];private step:Point|null=null;private rest:Point=getSpawn('lane');
  constructor(canvas:HTMLCanvasElement){this.canvas=canvas;canvas.width=W;canvas.height=H;this.context=canvas.getContext('2d')!;this.context.imageSmoothingEnabled=false;this.render=this.render.bind(this);this.animation=requestAnimationFrame(this.render);}
  get target(){return this._target;}
  set target(value:MovementTarget|null){if(value===null)this.stop();else this.move(value.x,value.y,value.done);}
  stop(){this._target=null;this.path=[];this.step=null;this.x=this.rest.x;this.y=this.rest.y;this.frame=0;}
  change(scene:SceneId,x?:number,y?:number){this.stop();this.scene=scene;const point=x===undefined||y===undefined?getSpawn(scene):groundPosition(scene,x,y);this.rest=point;this.x=point.x;this.y=point.y;this.keys.clear();this.facing='up';this.onPosition(this.x,this.y);this.syncPosition();}
  move(x:number,y:number,done?:()=>void){
    this.stop();const end=groundPosition(this.scene,x,y);const route=findPath(this.scene,this.rest,end);
    if(!route.length){if(this.rest.x===end.x&&this.rest.y===end.y)done?.();return;}
    this._target={...end,done};this.path=route;
  }
  moveToEvent(id:string,done:()=>void=()=>{}){
    this.stop();const event=maps[this.scene].events[id];if(!event)return false;
    const end=interactionPoint(this.scene,id,this.rest);
    if(!eventIsAdjacent(this.scene,id,end))return false;
    const finish=()=>{const point=eventPoint(this.scene,id);this.face(point.x-this.x,point.y-this.y);done();};
    this.move(end.x,end.y,finish);return true;
  }
  nearestEvent():string|null{
    const current=toTile(this.rest),direction={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[this.facing];
    const entries=Object.entries(maps[this.scene].events).filter(([id])=>eventIsAdjacent(this.scene,id,this.rest));
    entries.sort(([,a],[,b])=>{const rank=(event:typeof a)=>event.col===current.col+direction[0]&&event.row===current.row+direction[1]?0:event.col===current.col&&event.row===current.row?1:2;return rank(a)-rank(b);});
    return entries[0]?.[0]??null;
  }
  private face(dx:number,dy:number){if(Math.abs(dx)>Math.abs(dy))this.facing=dx<0?'left':'right';else if(dy)this.facing=dy<0?'up':'down';this.canvas.dataset.facing=this.facing;}
  private inputDirection():Point|null{
    const directions:Record<string,Point>={arrowleft:{x:-1,y:0},a:{x:-1,y:0},arrowright:{x:1,y:0},d:{x:1,y:0},arrowup:{x:0,y:-1},w:{x:0,y:-1},arrowdown:{x:0,y:1},s:{x:0,y:1}};
    for(const key of [...this.keys].reverse())if(directions[key])return directions[key];return null;
  }
  private update(dt:number){
    if(!this.enabled)return;
    const input=this.inputDirection();
    if(input){this.path=[];this._target=null;}
    if(!this.step){
      if(input){this.face(input.x,input.y);const tile=toTile(this.rest);if(isWalkable(this.scene,tile.col+input.x,tile.row+input.y))this.step={x:this.rest.x+input.x*T,y:this.rest.y+input.y*T};}
      else if(this.path.length)this.step=this.path.shift()!;
      if(this.step)this.face(this.step.x-this.x,this.step.y-this.y);
    }
    if(this.step){
      const dx=this.step.x-this.x,dy=this.step.y-this.y,distance=Math.abs(dx)+Math.abs(dy),amount=Math.min(distance,dt*148);
      this.x+=Math.sign(dx)*amount;this.y+=Math.sign(dy)*amount;this.frame+=dt*14;
      if(amount>=distance){this.rest={...this.step};this.x=this.rest.x;this.y=this.rest.y;this.step=null;this.onPosition(this.x,this.y);this.syncPosition();
        if(!this.path.length&&this._target){const done=this._target.done;this._target=null;done?.();}
      }
    }else this.frame=0;
  }
  private propSprites():PropSprite[]{
    if(this.sprites.has(this.scene))return this.sprites.get(this.scene)!;
    const result=maps[this.scene].props.filter(p=>p.kind!=='rug').map(prop=>{
      const canvas=document.createElement('canvas'),x=prop.col*T-24,y=prop.row*T-80;
      canvas.width=prop.width*T+48;canvas.height=prop.height*T+100;
      ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.translate(-x,-y);seed=prop.col*71+prop.row*19;drawProp(prop);
      return {canvas,x,y,depth:(prop.row+prop.height)*T-8};
    });this.sprites.set(this.scene,result);return result;
  }
  private syncPosition(){this.canvas.dataset.playerX=String(this.rest.x);this.canvas.dataset.playerY=String(this.rest.y);this.canvas.dataset.facing=this.facing;}
  background(){if(!this.backgrounds.has(this.scene))this.backgrounds.set(this.scene,background(this.scene));return this.backgrounds.get(this.scene)!;}
  render(time:number){
    const dt=Math.min(Math.max((time-this.last)/1000,0),.045);this.last=time;this.update(dt);
    const c=this.context;c.clearRect(0,0,W,H);c.drawImage(this.background(),0,0);
    const layers:{depth:number;draw:()=>void}[]=this.propSprites().map(p=>({depth:p.depth,draw:()=>c.drawImage(p.canvas,p.x,p.y)}));
    for(const event of Object.values(maps[this.scene].events))if(event.kind==='person'){const point={x:event.col*T+T/2,y:event.row*T+T/2};layers.push({depth:point.y,draw:()=>drawPerson(c,point.x,point.y,event.actor,0,'down')});}
    layers.push({depth:this.y,draw:()=>drawPerson(c,this.x,this.y,'shen',this.motion?this.frame:0,this.facing)});
    layers.sort((a,b)=>a.depth-b.depth);for(const layer of layers)layer.draw();ctx=c;
    for(const prop of maps[this.scene].props)if(prop.kind==='lamp')glow(prop.col*T+16,prop.row*T-48,95,.14);
    if(!maps[this.scene].outdoors)glow(384,240,210,.13);
    // Subtle night tint preserves the readable pixel palette and warm lamps.
    rect(0,0,W,H,maps[this.scene].outdoors?'#13273e1c':'#172b3610');
    const vignette=c.createRadialGradient(W/2,H/2,180,W/2,H/2,485);vignette.addColorStop(0,'#07131e00');vignette.addColorStop(1,'#07131e88');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    poly([[this.x-3,this.y-51],[this.x+3,this.y-51],[this.x,this.y-47]],'#e8d5a1');
    if(this._target){c.strokeStyle='#e0cf9eaa';c.lineWidth=1;c.strokeRect(this._target.x-10,this._target.y-7,20,14);rect(this._target.x-1,this._target.y-1,3,3,'#e0cf9e');}
    if(maps[this.scene].outdoors&&this.motion){
      for(let i=0;i<85;i++){const x=(i*83+time*.019)%W,y=(i*53+time*.16)%H;line(x,y,x-2,y+7,'#afc0c225');}
      for(let i=0;i<10;i++){const phase=(time*.0006+i*.17)%1;c.strokeStyle=`rgba(166,193,186,${(1-phase)*.12})`;c.strokeRect(220+(i*61)%400,230+(i*37)%240,phase*12+2,phase*4+1);}
    }
    this.animation=requestAnimationFrame(this.render);
  }
}
