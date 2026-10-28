import type { SceneId } from './types';
import type { MapProp } from './grid';

// Authored pixel materials: a small palette, deliberately placed wear, and a
// common one-pixel edge. No photograph noise or per-frame random texture.
const ink = '#24292d';
function painter(c: CanvasRenderingContext2D) {
  const r = (x:number,y:number,w:number,h:number,color:string) => {
    c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const l = (x:number,y:number,xx:number,yy:number,color:string) => {
    x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);
    const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;
    let error=dx+dy;
    for(;;){r(x,y,1,1,color);if(x===xx&&y===yy)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
  };
  const label=(s:string,x:number,y:number,size=9,color='#c3b798')=>{
    c.font=`${size}px "Noto Serif CJK SC", SimSun, serif`;c.textAlign='center';c.fillStyle=color;c.fillText(s,Math.round(x),Math.round(y));
  };
  return {r,l,label};
}
const hash=(x:number,y:number)=>{
  let n=Math.imul(x+19,374761393)^Math.imul(y+41,668265263);
  n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;
};
// Sparse, connected pigment clusters: no white-noise field over the whole tile.
function grain(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,seed:number,light:string,dark:string,count=12){
  const {r}=painter(c);
  for(let i=0;i<count;i++){
    const n=hash(seed,i),xx=x+n%Math.max(1,w-3),yy=y+(n>>>8)%Math.max(1,h-2);
    r(xx,yy,1+n%3,1,i%3?light:dark);
    if(i%4===0)r(xx+1,yy+1,2,1,light);
  }
}

export function drawGroundTile(c:CanvasRenderingContext2D,kind:string,col:number,row:number):boolean {
  const {r,l}=painter(c),x=col*32,y=row*32,v=hash(col,row);
  if(kind===','){
    r(x,y,32,32,'#3b4247');
    // Broad patched asphalt, with only a handful of aggregate clusters.
    if(v%5===0){r(x+3,y+9,24,12,'#3e4549');r(x+7,y+6,16,19,'#3e4549');}
    for(let i=0;i<5;i++){const n=hash(col*7+i,row);r(x+n%30,y+(n>>>8)%30,2,1,i%2?'#464c50':'#353d42');}
    if(v%19===0){l(x+4,y+10,x+11,y+14,'#2b343b');l(x+11,y+14,x+16,y+12,'#2b343b');}
    return true;
  }
  if(kind==='.'){
    // Offset stone slabs; light only on the upper edge, not every pixel.
    r(x,y,32,32,'#3e4648');
    for(let yy=0;yy<32;yy+=16)for(let xx=-((row*2+yy/16)%2)*16;xx<32;xx+=32){
      const start=Math.max(0,xx),end=Math.min(32,xx+31),shade=hash(col+xx,row+yy);
      r(x+start,y+yy+1,end-start,14,['#69706b','#626b68','#606865','#6d726b'][shade%4]);
      r(x+start+1,y+yy+1,Math.max(0,end-start-2),1,'#7d8174');
      r(x+start,y+yy+14,end-start,1,'#4d5756');
      if(end-start>7){r(x+start,y+yy+1,1,2,'#3e4648');r(x+end-1,y+yy+13,1,2,'#3e4648');}
      grain(c,x+start+1,y+yy+2,end-start-2,11,shade,'#a0a18c25','#2d3b3d25',9);
      if(end-start>10&&shade%3===0){r(x+start+5,y+yy+5,4,1,'#777c73');r(x+start+8,y+yy+6,2,1,'#777c73');}
      if(end-start>12&&shade%7===0){l(x+start+2,y+yy+12,x+start+5,y+yy+9,'#4c5654');l(x+start+5,y+yy+9,x+start+9,y+yy+9,'#4c5654');}
    }
    return true;
  }
  if(kind==='='||kind==='p'){
    r(x,y,32,32,'#423b34');
    const ramp=kind==='p'?['#6e6b57','#77715c','#686652','#7b735d']:['#77614c','#806950','#715d4b','#846e52'];
    for(let yy=0;yy<32;yy+=8){
      const n=hash(col,row*4+yy/8);r(x,y+yy,32,7,ramp[n%4]);
      r(x,y+yy,32,1,kind==='p'?'#8d8368':'#947858');
      grain(c,x+1,y+yy+1,30,6,n,'#cab18a20','#372e2920',5);
      const joint=(col*13+row*7+yy*3)%32;r(x+joint,y+yy,1,7,'#5a4b3d');
      r(x+(n>>>5)%19,y+yy+3,9,1,kind==='p'?'#625f50':'#685541');
      if(n%5===0){r(x+joint+2,y+yy+2,1,1,'#363a36');r(x+joint+2,y+yy+5,1,1,'#363a36');}
    }
    return true;
  }
  if(kind===':'){
    r(x,y,32,32,'#778478');
    for(let yy=0;yy<32;yy+=16)for(let xx=0;xx<32;xx+=16){
      const light=(xx+yy)%32===0;r(x+xx+1,y+yy+1,15,15,light?'#a6ab98':'#788f86');
      r(x+xx+2,y+yy+1,12,1,light?'#babba7':'#8c9f91');
      r(x+xx+1,y+yy+14,14,1,light?'#929b8c':'#6b8079');
    }
    if(v%17===0){l(x+3,y+29,x+8,y+25,'#737e73');l(x+8,y+25,x+10,y+18,'#737e73');}
    return true;
  }
  if(kind==='#'){
    r(x,y,32,32,'#393d3e');
    for(let yy=0;yy<32;yy+=8)for(let xx=(yy%16?-8:0);xx<32;xx+=16){
      const a=Math.max(0,xx),b=Math.min(32,xx+15),n=hash(col*32+xx,row*32+yy);
      r(x+a,y+yy+1,b-a,6,['#635a51','#6d6055','#5c5650','#716459'][n%4]);
      r(x+a+1,y+yy+1,Math.max(0,b-a-2),1,'#837365');
      grain(c,x+a+1,y+yy+2,b-a-2,4,n,'#b5a08930','#332f2b35',5);
      if(n%5===0)r(x+a+3,y+yy+4,3,1,'#504c47');
    }
    return true;
  }
  if(kind==='~'){
    r(x,y,32,32,'#293d47');
    for(let i=0;i<3;i++){const n=hash(col*5+i,row);const xx=n%18,yy=(n>>>8)%29;r(x+xx,y+yy,8+n%7,1,'#3c535a');r(x+xx+3,y+yy+2,10,1,'#243843');}
    return true;
  }
  return false;
}

export function drawRoomArchitecture(c:CanvasRenderingContext2D,scene:SceneId){
  const {r,l,label}=painter(c);
  const clinical=scene==='clinic',publicRoom=scene==='waiting',utility=scene==='warehouse';
  const plaster=clinical?'#9b9d87':publicRoom?'#97927c':utility?'#79766a':'#8f8672';
  r(38,70,692,57,plaster);
  grain(c,40,72,688,52,scene.length*7,'#d6c9a41a','#414d4020',250);
  // Plaster chips are clusters at wall joints; large fields remain quiet.
  for(const [x,y,w,h] of [[45,76,17,4],[46,80,9,3],[203,109,12,4],[212,113,8,2],[624,76,26,3],[632,79,12,3],[712,110,13,8]])r(x,y,w,h,'#767363');
  r(38,107,692,20,clinical?'#5c7771':publicRoom?'#546d67':utility?'#555f5a':'#55594f');
  r(38,106,692,2,clinical?'#b6b69a':'#aaa084');r(38,109,692,1,'#3e514e');
  if(!clinical)for(let x=46;x<730;x+=24){r(x,111,1,15,'#404b46');r(x+1,111,1,15,'#6b7060');}
  r(38,123,692,5,'#343e3c');r(39,123,690,1,'#a09579');
  // Narrow timber perimeter and a visible southern threshold.
  r(38,128,26,320,'#2d3432');r(40,128,5,320,'#7e745f');r(43,128,1,320,'#a4977b');
  r(704,128,26,320,'#303734');r(721,128,6,320,'#756c5b');r(723,128,1,320,'#9c9076');
  for(let y=140;y<444;y+=40){r(41,y,2,2,'#3b4038');r(723,y,2,2,'#3b4038');}
  // Window recesses belong to the wall, not floating floor props.
  for(const x of [237,495]){
    r(x-4,73,42,48,ink);r(x-3,72,41,3,'#beb396');
    r(x,76,34,39,'#526365');r(x+2,78,30,35,utility?'#72807a':'#b29a6b');
    r(x+3,79,10,32,utility?'#8e9989':'#d2b783');
    r(x+15,76,3,40,'#4c5045');r(x,94,34,3,'#4c5045');
    r(x-5,116,44,4,'#b5a887');r(x-4,120,44,3,'#454b43');
    if(!utility){for(const side of [-4,29]){r(x+side,77,8,37,clinical?'#788e80':'#596d71');r(x+side+1,78,2,34,clinical?'#a2b09a':'#88938a');r(x+side+6,77,1,38,'#344c52');}}
  }
  // Exposed conduit and a small fuse box are fixed to the wall.
  l(74,77,195,77,'#494f48');l(74,77,74,112,'#494f48');l(75,78,75,112,'#b7ab90');
  r(68,89,12,17,'#414c49');r(69,90,10,14,'#6b786e');r(71,92,6,5,'#b5b59a');r(75,101,2,2,'#292f31');
  const names:Record<string,string>={home:'沈 宅',press:'长 明 印 刷',clinic:'仁 安 诊 所',archive:'档 案 值 班',warehouse:'沿 江 货 栈',waiting:'夜 航 候 船'};
  r(339,79,90,23,'#373f3c');r(340,80,88,1,'#b3a181');r(342,82,84,17,'#54564b');
  label(names[scene]??'',384,94,11,'#ded0a7');
  r(64,128,640,5,'#182b343d');r(64,133,640,4,'#182b341f');
  // A restrained, stepped shaft of window light; opaque pixel edges.
  for(const x of [239,497])for(let i=0;i<25;i++){
    r(x+i,132+i*2,32+i*.6,2,'#e0c58b09');
    r(x+16+i,132+i*2,2,2,'#26373c0b');
  }
}

export function drawGroundDetails(c:CanvasRenderingContext2D,scene:SceneId){
  const {r,l,label}=painter(c);
  const puddle=(x:number,y:number,w:number)=>{
    r(x+5,y,w-12,2,'#303f47');r(x,y+2,w,5,'#303f47');r(x+8,y+7,w-15,2,'#303f47');
    r(x+7,y+2,w-15,1,'#5b6d6d');r(x+14,y+6,11,1,'#7b8476');
  };
  if(scene==='lane'){
    for(const x of [221,544]){
      r(x,192,4,288,'#252f34');r(x+4,192,3,288,'#828475');
      for(let y=196;y<480;y+=24)r(x+4,y,3,1,'#4d5753');
    }
    puddle(289,228,48);puddle(447,352,59);puddle(327,437,32);
    // Sewer cover and repaired kerb, kept away from the main walking silhouette.
    r(383,299,27,18,'#28363c');r(384,300,25,1,'#7f8779');
    for(let y=303;y<316;y+=4)for(let x=387;x<407;x+=5)r(x,y,3,1,'#69766e');
    for(const [x,y] of [[266,405],[509,259],[238,295]]){r(x,y,7,4,'#aeaa8a');r(x+1,y+1,4,1,'#6e7367');r(x+5,y+3,2,2,'#575f58');}
    // A short damp stain at each building's foot, not a uniform screen filter.
    for(const x of [44,302,556]){r(x,191,130,3,'#1d303742');r(x+8,194,100,2,'#1d30371e');}
  }
  if(scene==='courtyard'){
    r(364,160,8,320,'#26393e');r(372,160,2,320,'#899083');
    for(let y=164;y<476;y+=12){r(365,y,6,2,'#697d77');r(366,y+2,5,1,'#1d2f36');}
    // Clothesline: different hems, patches, pegs and seams.
    l(230,113,359,119,'#282f30');l(359,119,491,122,'#282f30');
    for(const [x,y,color] of [[255,115,'#9b9d8a'],[310,118,'#65777a'],[405,120,'#a49c83']] as const){
      r(x+3,y+2,21,30,color);r(x,y+3,5,12,color);r(x+23,y+3,5,12,color);
      r(x+8,y+1,10,3,'#4a5653');r(x+4,y+4,2,24,'#c8c4a15a');r(x+20,y+5,2,23,'#32474c55');
      r(x+4,y+31,19,2,'#4e615f');r(x+7,y-1,2,4,'#bba37a');r(x+22,y-1,2,4,'#bba37a');
      r(x+14,y+19,5,5,'#6f78704f');l(x+14,y+19,x+18,y+23,'#c2b79780');
    }
    // Shared stone sink, enamel basin and tap, a compact ground-level vignette.
    r(229,264,68,24,'#3b4b4b');r(230,260,65,22,'#8d9385');r(234,263,57,15,'#4b6768');
    r(236,265,53,10,'#354e59');r(240,267,32,1,'#889e95');r(230,279,65,4,'#b2b29a');
    r(238,284,6,8,'#4e5c56');r(283,284,6,8,'#4e5c56');r(254,253,3,13,'#b6b69a');r(251,253,8,2,'#b6b69a');
    r(271,263,14,2,'#d1cbb2');r(272,265,12,7,'#7c9693');r(273,271,10,2,'#ced0b4');
    puddle(258,295,39);puddle(382,359,25);
  }
  if(scene==='home'){
    // Scuffed floor below the desk; a patched strip by the old threshold.
    for(const [x,y,w] of [[167,303,32],[181,307,19],[557,421,26],[361,437,21]]){r(x,y,w,1,'#b69a6a40');r(x+2,y+2,w-4,1,'#443c3540');}
    r(351,434,34,12,'#555549');r(353,435,30,1,'#9c9678');
  }
  if(scene==='press'){
    for(const [x,y] of [[305,332],[348,297],[289,356]]){r(x,y,8,2,'#2f3b3b');r(x+2,y-2,4,5,'#2f3b3b');}
    for(const [x,y] of [[556,355],[562,359],[567,363]]){r(x,y,13,9,'#c6bd9e');r(x+2,y+3,9,1,'#6f7768');r(x+2,y+5,7,1,'#6f7768');}
  }
  if(scene==='warehouse'){
    for(const x of [221,543])for(let y=174;y<414;y+=26){r(x,y,2,15,'#b5a06b75');r(x,y+4,1,3,'#454d48');}
    for(const [x,y,n] of [[252,218,'壹'],[500,218,'贰'],[252,338,'叁']] as const)label(n,x,y,13,'#b0a17a');
  }
  if(scene==='river'){
    for(let y=18;y<190;y+=15){r(552-(y%13),y,3+y%11,1,'#aa9d6636');r(564,y+3,6,1,'#b6a87829');}
    puddle(296,399,53);puddle(422,452,41);
    for(let x=34;x<730;x+=32){r(x,260,30,2,'#9c9e87');r(x,263,30,3,'#283d43');}
  }
}

/** Deliberately shaped small props replace stretched or placeholder blocks.
 * Draw into the same Y-sorted sprite and preserve its original collision base. */
export function drawCraftedProp(c:CanvasRenderingContext2D,p:MapProp,scene:SceneId):boolean {
  const {r,l,label}=painter(c),x=p.col*32,y=p.row*32,w=p.width*32,h=p.height*32;
  if(p.kind==='poster'){
    r(x,y-22,32,53,'#2c3536');r(x+1,y-22,30,2,'#8d8065');r(x+3,y-19,26,46,'#655b49');
    r(x+4,y-17,23,40,'#b3a783');r(x+6,y-15,19,4,'#86594b');
    for(let yy=0;yy<5;yy++)for(let xx=0;xx<3;xx++){r(x+7+xx*6,y-7+yy*5,3,1,'#6d6b57');r(x+7+xx*6,y-6+yy*5,1,2,'#6d6b57');}
    r(x+20,y+14,5,5,'#976352');r(x+21,y+15,3,3,'#c4b38c');
    r(x+4,y+18,3,6,'#655b49');r(x+24,y+20,4,5,'#655b49');r(x+5,y-17,2,2,'#ddcba0');
    return true;
  }
  if(p.kind==='rail'){
    r(x,y-5,w,3,'#3d4c4d');r(x,y-5,w,1,'#a0a38d');r(x,y+10,w,2,'#586b68');
    for(let xx=x+6;xx<x+w;xx+=16){r(xx,y-3,2,29,'#34494e');r(xx,y-3,1,29,'#7a8980');}
    for(let xx=x+2;xx<x+w;xx+=64){r(xx,y-12,5,39,'#35484a');r(xx+1,y-10,1,36,'#99a08a');r(xx-1,y-13,7,3,'#7b8b7f');r(xx-2,y+25,9,3,'#293d43');}
    return true;
  }
  if(p.kind==='cabinet'){
    const top=y-25;
    r(x+2,top,w-4,h+24,'#354744');r(x+3,top,w-6,3,'#a3aa91');r(x+4,top+3,w-8,h+18,'#687b6c');
    const rows=scene==='courtyard'?3:2,step=(h+15)/rows;
    for(let i=0;i<rows;i++){
      const yy=top+5+i*step;r(x+6,yy,w-12,step-2,'#819080');r(x+7,yy+1,w-14,1,'#9fa68c');grain(c,x+8,yy+2,w-16,step-4,i+scene.length,'#c6cbb025','#243b3525',7);r(x+6,yy+step-3,w-12,1,'#3e534f');
      r(x+w/2-8,yy+3,16,6,'#4b5d53');r(x+w/2-6,yy+4,12,3,'#bcb79b');r(x+w/2-3,yy+5,6,1,'#747b69');
      if(step>14){r(x+w/2-6,yy+11,12,3,'#2c4141');r(x+w/2-5,yy+11,10,1,'#bac0a4');}
      r(x+w-12,yy+4,2,2,'#b8b19a');
    }
    r(x+6,y+h-2,4,4,ink);r(x+w-10,y+h-2,4,4,ink);
    return true;
  }
  if(p.kind==='clock'){
    r(x+3,y-33,27,53,'#303734');r(x+4,y-33,25,2,'#ab9873');r(x+5,y-30,23,46,'#6a5641');
    r(x+7,y-28,19,25,'#c3baa0');r(x+9,y-26,15,21,'#d9ccaa');
    for(const [xx,yy] of [[16,-25],[16,-7],[10,-16],[23,-16]])r(x+xx,y+yy,2,2,'#665e4a');
    l(x+17,y-16,x+17,y-23,'#3b413a');l(x+17,y-16,x+22,y-12,'#3b413a');
    r(x+8,y+1,17,12,'#323f3b');r(x+16,y+1,2,9,'#ae9261');r(x+13,y+8,8,4,'#b59c65');r(x+5,y+17,23,2,'#a68f69');
    return true;
  }
  if(p.kind==='rug'){
    r(x+6,y+6,w-12,h-12,'#544547');r(x+8,y+8,w-16,h-16,'#887461');r(x+11,y+11,w-22,h-22,'#5e5152');
    for(let xx=x+14;xx<x+w-14;xx+=8){r(xx,y+14,3,2,'#a28c69');r(xx,y+h-16,3,2,'#a28c69');}
    for(let yy=y+22;yy<y+h-20;yy+=12)for(let xx=x+22;xx<x+w-20;xx+=18){r(xx,yy,5,1,'#8b7663');r(xx+2,yy-2,1,5,'#8b7663');}
    for(let xx=x+8;xx<x+w-8;xx+=3){r(xx,y+3,1,3,'#ae9c7c');r(xx,y+h-6,1,3,'#ae9c7c');}
    return true;
  }
  if(p.kind==='curtain'&&scene==='home'){
    c.save();c.translate(0,-26);
    r(x+7,y-39,w-14,63,ink);r(x+9,y-38,w-18,3,'#c1b191');
    r(x+13,y-33,w-26,50,'#586e71');r(x+16,y-31,w-32,47,'#8f9b8c');
    r(x+w/2-1,y-34,3,52,'#4a5953');r(x+12,y-13,w-24,3,'#4a5953');
    r(x+6,y+19,w-12,5,'#b3a98d');r(x+8,y+24,w-16,2,'#394a46');
    for(const left of [x+8,x+w-27])for(let xx=0;xx<19;xx+=6){
      r(left+xx,y-32,6,50,'#5f7477');r(left+xx+1,y-32,2,48,'#91a093');r(left+xx+5,y-30,1,48,'#3a525a');
    }
    c.restore();return true;
  }
  if(p.kind==='lamp'&&!['lane','courtyard','river'].includes(scene)){
    // A domestic standing lamp, rather than a full outdoor street lantern.
    r(x+8,y+26,18,3,'#273838');r(x+11,y+24,12,2,'#55675f');
    r(x+15,y-39,4,63,'#354742');r(x+16,y-37,1,60,'#99a087');
    for(let yy=0;yy<18;yy++){
      const inset=Math.floor((18-yy)/3);r(x+3+inset,y-49+yy,28-inset*2,1,'#b6a780');
      r(x+6+inset,y-49+yy,2,1,'#e1c693');r(x+25-inset,y-49+yy,2,1,'#7f8066');
    }
    r(x+3,y-32,28,2,'#404f43');r(x+12,y-30,10,3,'#e2c689');
    return true;
  }
  if(p.kind==='curtain'){
    // A ward divider is cloth on a pole, not a window atlas stretched five tiles.
    const top=y-25;
    r(x+3,top-4,w-6,2,'#a6aa95');r(x+4,top-2,2,28,'#596c64');r(x+w-6,top-2,2,28,'#596c64');
    const span=scene==='clinic'?w-24:w-8;
    for(let xx=0;xx<span;xx+=8){r(x+5+xx,top,7,23,'#7f9185');r(x+6+xx,top,2,22,'#a2af9a');r(x+11+xx,top+2,1,20,'#536f67');r(x+7+xx,top-3,1,4,'#d2c9aa');}
    r(x+5,top+23,span,2,'#526b63');return true;
  }
  if(p.kind==='crate' && p.width<=2 && p.height<=1){
    const top=y-6;
    r(x+2,top,w-4,h+4,'#483d31');r(x+3,top+1,w-6,9,'#95754e');r(x+4,top+1,w-8,1,'#b29262');
    for(let yy=top+11;yy<y+h-3;yy+=7){r(x+4,yy,w-8,6,'#796044');r(x+5,yy,w-10,1,'#97784e');grain(c,x+5,yy+1,w-10,4,yy,'#c4a36a40','#372f2640',9);}
    for(const xx of [x+5,x+w-9]){r(xx,top+11,4,h-9,'#b08b59');r(xx+1,top+12,1,1,'#3d3c32');r(xx+1,y+h-5,1,1,'#3d3c32');}
    l(x+10,top+12,x+w-11,y+h-6,'#c0a071');l(x+11,top+12,x+w-10,y+h-6,'#9c7a50');
    if(w>=60){r(x+w/2-7,top+13,15,11,'#c5b58e');r(x+w/2-4,top+16,9,1,'#696a55');r(x+w/2-4,top+19,6,1,'#696a55');}
    return true;
  }
  if(p.kind==='desk' && (p.variant==='type'||scene==='waiting')){
    const top=y-12;
    r(x+3,top+15,w-6,h-2,'#544536');r(x+5,top+17,w-10,h-6,'#776046');
    r(x+1,top,w-2,20,'#a18356');r(x+2,top+1,w-4,1,'#cfad79');r(x+2,top+18,w-4,3,'#3e3c32');
    for(let xx=x+8;xx<x+w-8;xx+=24){r(xx,top+23,1,h-12,'#b29565');r(xx+1,top+23,1,h-12,'#493f32');}
    if(p.variant==='type'){
      for(let yy=0;yy<3;yy++)for(let xx=0;xx<10;xx++){
        r(x+9+xx*7,top+3+yy*5,6,4,'#403f39');r(x+10+xx*7,top+3+yy*5,3,3,'#a0a28c');r(x+11+xx*7,top+4+yy*5,1,1,'#444b43');
      }
    }else{
      r(x+22,top+3,22,13,'#d1c5a3');r(x+24,top+5,18,1,'#82816c');r(x+24,top+8,15,1,'#82816c');
      r(x+w-43,top+4,20,11,'#455954');r(x+w-42,top+4,18,2,'#97a08b');
      for(let xx=x+9;xx<x+w-5;xx+=14){r(xx,top-23,2,23,'#343f3d');r(xx,top-23,1,23,'#9b9e87');}
      r(x+6,top-24,w-12,3,'#6c7261');r(x+w/2-22,top+24,44,16,'#414b41');label('问 讯',x+w/2,top+36,10,'#d7c7a0');
    }
    return true;
  }
  return false;
}
