// Hand-authored pixel masks, shared palette ramps, and four animation poses.
// Every sprite is rasterized once at 32×48; the map never scales vector people.
export type Facing = 'down' | 'up' | 'left' | 'right';
const front = [
  '         oooooo         ',
  '       oohHHHhhoo       ',
  '      ohHHHjjhhhho      ',
  '     ohHHHjjjhhhhho     ',
  '     ohHjjjjhhhhho      ',
  '    ohhjjjhtsssShhho    ',
  '    ohjjhtsssSSSShho    ',
  '    ohhtsssSSSSSShho    ',
  '    ohhteeSsstteShho    ',
  '     ottweSssweSsto     ',
  '      otsSSSsSSSsto     ',
  '      ottsssStsssto     ',
  '       ottssssstto      ',
  '        otttttto        ',
  '       oddtStddo        ',
  '     oodlcSSclddoo      ',
  '    odlclcAclcdddco     ',
  '   odlcllcAclcdddcoo    ',
  '   odlcllcAclcdddcco    ',
  '   odlcllcAclcdddcco    ',
  '   odlcllcAclcdddcco    ',
  '   odlcclcAclcdddcco    ',
  '   odlcclcAclcdddcco    ',
  '   ottcclcAclcdddcto    ',
  '   otScclcAclcdddSso    ',
  '    ooccddcddcddoo     ',
  '      occddddddco      ',
  '      oddccdddddo      ',
  '       ooddddoo        ',
];
const back = [
  '         oooooo         ',
  '       oohHHHhhoo       ',
  '      ohHHHjjhhhho      ',
  '     ohHHjjjjhhhhho     ',
  '    ohHHjjjjhhhhhhho    ',
  '    ohHjjjjjhhhhhhho    ',
  '    ohjjjjjhhhhhhhho    ',
  '    ohjjjjjhhhhhhhho    ',
  '    ohjjjjhhhhhhhhho    ',
  '     ohjjhhhhhhhho      ',
  '     ohhhhhhhhhho       ',
  '      ohhhhhhhho        ',
  '       ohhhhhoo         ',
  '        oooo            ',
  '       oodddooo         ',
  '     oodllllldddoo      ',
  '    odlclllllcdddco     ',
  '   odlcllllllcdddcoo    ',
  '   odlcllllllcdddcco    ',
  '   odlcllllllcdddcco    ',
  '   odlcllclllcdddcco    ',
  '   odlcclclllcdddcco    ',
  '   odlcclclllcdddcco    ',
  '   ottcclclllcdddcto    ',
  '   otScclclllcdddSso    ',
  '    ooccddcddcddoo      ',
  '      occddddddco       ',
  '      oddccdddddo       ',
  '       ooddddoo         ',
];
const side = [
  '         ooooo          ',
  '       oohHHhhoo        ',
  '      ohHHjjhhhho       ',
  '     ohHHjjhhhhho       ',
  '     ohHjjhhhhhhho      ',
  '     ohjhhhhhhhhho      ',
  '     otthhhhhhhhho      ',
  '     otShhhhhhhhho      ',
  '    ottSshhhhhhhho      ',
  '    otweSshhhhhho       ',
  '   otSSSSShhhhho        ',
  '    ottssSShhho         ',
  '     otttsStto          ',
  '      ottttto           ',
  '       odStdo           ',
  '      odlcldoo          ',
  '     odlllcddco         ',
  '     odcllcdddco        ',
  '     odcllcdddco        ',
  '     odcllcdddco        ',
  '     odcllcdddco        ',
  '     odcllcdddco        ',
  '     odcllcdddco        ',
  '     odcttcdddco        ',
  '     odtSscdddco        ',
  '      oddcddddo         ',
  '      odccddddo         ',
  '      oddcdddoo         ',
  '       oodddoo          ',
];
const palettes: Record<string, { coat: string[]; hair: string[]; skin: string[]; accessory: string[] }> = {
  shen: {coat:['#283244','#40546b','#728a99'],hair:['#252733','#39404a','#626972'],skin:['#9b6a57','#c89972','#efc79a'],accessory:['#aa9470','#d4c39d']},
  aunt: {coat:['#433043','#715368','#a1838b'],hair:['#555464','#919099','#c4c2b9'],skin:['#936d5c','#bf9a7a','#e0bd93'],accessory:['#a89c7c','#d1c5a3']},
  lin: {coat:['#363a36','#626d51','#a1a17b'],hair:['#262631','#383239','#645457'],skin:['#9e6c59','#d5a478','#f1cda0'],accessory:['#c6b995','#eee0b9']},
  doctor: {coat:['#6b6e6b','#b2b6a4','#e7dfbd'],hair:['#33313a','#57535a','#93918c'],skin:['#926b55','#bc9171','#e3be94'],accessory:['#3e5663','#70909c']},
  gu: {coat:['#3f3031','#745844','#ad8b66'],hair:['#65616b','#a6a0a1','#dbd1b7'],skin:['#8a6556','#b48b6b','#d4ad82'],accessory:['#8d7b68','#c6b699']},
};
const cache = new Map<string, HTMLCanvasElement>();
function sprite(type: string, facing: Facing, gait: number) {
  const key = `${type}:${facing}:${gait}`;
  const cached = cache.get(key); if (cached) return cached;
  const canvas = document.createElement('canvas'); canvas.width=32; canvas.height=48;
  const ctx = canvas.getContext('2d')!;
  const p = palettes[type] ?? palettes.shen;
  const colors: Record<string,string> = {
    o:'#1a1b2a',h:p.hair[0],j:p.hair[1],H:p.hair[2],
    t:p.skin[0],s:p.skin[1],S:p.skin[2],e:'#322c30',w:'#f6e7c5',
    d:p.coat[0],c:p.coat[1],l:p.coat[2],a:p.accessory[0],A:p.accessory[1],
  };
  const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  if(facing==='right'){ctx.translate(32,0);ctx.scale(-1,1);}
  const mask=facing==='up'?back:facing==='down'?front:side;
  const bob=gait?1:0;
  mask.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(colors[pixel])r(x+4,y+5+bob,1,1,colors[pixel]);}));
  // A complete four-step walk cycle: alternating boots, then both planted.
  const left=gait===1?-2:0,right=gait===2?-2:0;
  if(facing==='left'||facing==='right'){
    r(12+left,34,5,8,p.coat[0]);r(16-right,34,4,8,'#35313b');
    r(10+left,40,7,4,'#202331');r(14-right,41,7,3,'#202331');r(10+left,40,5,1,'#767b83');
  }else{
    r(11,34+left,4,8,p.coat[0]);r(17,34+right,4,8,'#35313b');
    r(9,40+left,6,4,'#222431');r(17,40+right,6,4,'#222431');
    r(10,40+left,4,1,'#85888b');r(18,40+right,4,1,'#72777e');
  }
  if(type==='shen'){
    r(10,19+bob,12,2,p.accessory[0]);r(12,19+bob,7,1,p.accessory[1]);
    if(facing!=='up'){r(19,21+bob,3,11,p.accessory[0]);r(19,22+bob,1,8,p.accessory[1]);}
    for(let y=21;y<34;y++)r(facing==='up'?12+(y-21)/3:22-(y-21)/3,y+bob,2,1,'#7a5742');
    r(9,30+bob,5,7,'#4c3935');r(10,30+bob,3,1,'#a27d57');
  }
  if(type==='aunt'&&facing==='down'){r(12,23+bob,10,8,p.accessory[0]);r(13,24+bob,8,1,p.accessory[1]);r(14,21+bob,1,3,p.accessory[1]);r(20,21+bob,1,3,p.accessory[1]);}
  if(type==='aunt'&&facing==='up'){r(13,13+bob,8,5,p.hair[1]);r(15,13+bob,5,1,p.hair[2]);}
  if(type==='lin'){for(let y=14;y<28;y+=3){r(facing==='up'?9:23,y+bob,3,4,p.hair[0]);r(facing==='up'?10:24,y+bob,1,2,p.hair[1]);}r(facing==='up'?10:23,28+bob,3,2,'#b4997b');}
  if((type==='doctor'||type==='gu')&&facing==='down'){
    r(10,13+bob,6,1,'#6a604f');r(18,13+bob,5,1,'#6a604f');r(10,16+bob,6,1,'#6a604f');r(18,16+bob,5,1,'#6a604f');r(16,14+bob,2,1,'#5d554d');
  }
  if(type==='doctor'&&facing==='down'){r(12,22+bob,1,6,'#34494f');r(20,22+bob,1,6,'#34494f');r(13,28+bob,7,1,'#34494f');r(19,28+bob,2,2,'#97a8a2');}
  cache.set(key,canvas);return canvas;
}
export function drawCharacter(ctx:CanvasRenderingContext2D,x:number,y:number,type='shen',frame=0,facing:Facing='down'){
  ctx.fillStyle='#0b102c65';ctx.fillRect(Math.round(x)-10,Math.round(y),20,3);
  ctx.fillRect(Math.round(x)-7,Math.round(y)+3,14,1);
  const gait=frame>0?[0,1,0,2][Math.floor(frame*.65)%4]:0;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sprite(type,facing,gait),Math.round(x)-16,Math.round(y)-44);
}
