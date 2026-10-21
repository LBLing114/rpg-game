// A separate 384 × 256 pixel tableau for the title: Shanghai's old waterfront.
// No scene events or game state are used. The painted layers are cached once.
const WIDTH = 384;
const HEIGHT = 256;
let painting: HTMLCanvasElement | null = null;
let frame: HTMLCanvasElement | null = null;

function paintWaterfront(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const c = canvas.getContext('2d')!;
  let seed = 1968;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const box = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const shape = (points: number[][], color: string) => {
    c.fillStyle = color; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fill();
  };
  const stroke = (x: number, y: number, endX: number, endY: number, color: string) => {
    const steps = Math.max(Math.abs(endX - x), Math.abs(endY - y));
    for (let i = 0; i <= steps; i++) box(x + (endX - x) * i / steps, y + (endY - y) * i / steps, 1, 1, color);
  };
  const sky = ['#101a29', '#152131', '#1b2a3a', '#223343', '#2a3d49', '#344953'];
  for (let y = 0; y < 124; y++) box(0, y, WIDTH, 1, sky[Math.min(5, Math.floor(y / 22))]);
  for (let i = 0; i < 1800; i++) box(random() * WIDTH, random() * 124, 1, 1, i % 2 ? '#b0b6a408' : '#07122514');

  // A stepped, partially veiled moon rather than a smooth vector disc.
  const moon = ['    xxxxxx    ', '  xxxxxxxxxx  ', ' xxxxxxxxxxxx ', 'xxxxxxxxxxxxxx', 'xxxxxxxxxxxxxx', 'xxxxxxxxxxxxxx', 'xxxxxxxxxxxxxx', ' xxxxxxxxxxxx ', '  xxxxxxxxxx  ', '    xxxxxx    '];
  moon.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === 'x') box(238 + x, 31 + y, 1, 1, (x + y) % 5 ? '#c3c7ad' : '#9baea1');
  }));
  for (let band = 0; band < 9; band++) {
    const x = -20 + random() * 350, y = 18 + random() * 64;
    box(x, y, 40 + random() * 120, 2, '#293d4b55');
    box(x + 14, y + 2, 45 + random() * 86, 2, '#2d414d33');
  }

  // Low masonry blocks and warehouses, appropriate to the period's riverbank.
  for (let x = -8; x < WIDTH; x += 17) {
    const h = 9 + Math.floor(random() * 18);
    box(x, 116 - h, 14 + random() * 12, h, '#293c46');
    box(x + 3, 114 - h, 8, 3, '#2c404a');
  }
  const building = (x: number, y: number, width: number, height: number, roof = false) => {
    box(x, y, width, height, '#3b484b');
    box(x + 2, y + 3, width - 4, height - 3, '#414d4e');
    box(x + width - 5, y + 2, 5, height - 2, '#2b3a40');
    if (roof) shape([[x - 2, y], [x + 7, y - 8], [x + width - 8, y - 8], [x + width + 2, y]], '#233740');
    box(x - 1, y, width + 2, 2, '#64706a');
    box(x, y + height - 3, width, 3, '#283b41');
    for (let yy = y + 6; yy < y + height - 5; yy += 9) {
      for (let xx = x + 4; xx < x + width - 6; xx += 7) {
        box(xx, yy, 3, 5, '#202f38');
        if (random() > .73) {
          box(xx, yy + 1, 2, 3, random() > .5 ? '#b09b66' : '#7d815f');
          box(xx, yy + 5, 3, 1, '#626b5c');
        }
      }
      box(x + 2, yy + 7, width - 8, 1, '#71807524');
    }
    for (let xx = x + 1; xx < x + width - 5; xx += 14) box(xx, y + 3, 1, height - 6, '#85908036');
  };
  building(7, 91, 42, 31, true);
  building(53, 78, 55, 44);
  building(111, 91, 25, 31, true);
  building(142, 82, 64, 40);
  // Old clock tower, with visible stone courses and a dark, weathered roof.
  box(164, 59, 20, 30, '#4f5b57');
  box(166, 61, 15, 24, '#65716a');
  box(163, 58, 22, 3, '#819080');
  box(167, 52, 14, 6, '#364950');
  shape([[165, 52], [174, 42], [183, 52]], '#243740');
  box(174, 38, 1, 5, '#839084');
  box(169, 65, 10, 9, '#b3b297');
  box(168, 67, 12, 5, '#b3b297');
  box(173, 66, 1, 5, '#32434a'); box(173, 70, 4, 1, '#32434a');
  box(169, 78, 3, 6, '#2c3e44'); box(176, 78, 3, 6, '#2c3e44');
  building(212, 96, 31, 27, true);
  building(250, 77, 36, 46, true);
  box(260, 66, 17, 5, '#485955'); box(264, 61, 10, 5, '#3d5153');
  building(293, 92, 43, 31);
  building(342, 99, 42, 25, true);
  box(0, 121, WIDTH, 3, '#76877b');
  box(0, 124, WIDTH, 3, '#223a42');
  for (let x = 4; x < WIDTH; x += 17) { box(x, 118, 1, 5, '#778577'); box(x - 1, 118, 3, 1, '#aca57b'); }

  // Broken horizontal reflections give the river its pixel texture.
  box(0, 127, WIDTH, HEIGHT - 127, '#1b3441');
  for (let y = 127; y < HEIGHT; y++) {
    if (y % 3 === 0) box(0, y, WIDTH, 1, y < 164 ? '#2b46504d' : '#15293770');
  }
  for (let i = 0; i < 980; i++) {
    const y = 128 + random() * 128;
    box(random() * WIDTH, y, 2 + random() * (3 + (y - 128) * .13), 1, ['#52717048', '#6e857344', '#0c263760', '#35575b70'][i % 4]);
  }
  for (const x of [26, 62, 83, 153, 176, 265, 312, 361]) {
    for (let i = 0; i < 13; i++) box(x - random() * 4 - i * .25, 129 + i * 3, 2 + random() * (3 + i * .5), 1, i % 3 ? '#a99b5b38' : '#c5ae704a');
  }

  // A small, moored passenger launch off the quay.
  const boatX = 278, boatY = 150;
  box(boatX + 7, boatY - 9, 32, 10, '#5c6459');
  box(boatX + 5, boatY - 11, 36, 2, '#25353a');
  for (let x = boatX + 10; x < boatX + 36; x += 7) { box(x, boatY - 7, 5, 5, '#b3a06b'); box(x + 2, boatY - 7, 1, 5, '#34474b'); }
  box(boatX + 18, boatY - 16, 4, 5, '#263943');
  shape([[boatX - 5, boatY], [boatX + 49, boatY], [boatX + 40, boatY + 8], [boatX + 3, boatY + 8]], '#17252f');
  box(boatX - 1, boatY + 1, 46, 1, '#7d816d');
  box(boatX + 8, boatY + 4, 30, 1, '#404849');
  for (let i = 0; i < 9; i++) box(boatX + 7 + random() * 24, boatY + 11 + i * 2, 3 + random() * 8, 1, '#b3a16c40');

  // Foreground left: worn stone quay, puddles, iron railings and a solitary lamp.
  shape([[0, 183], [91, 199], [152, 256], [0, 256]], '#252f36');
  c.save(); c.beginPath(); c.moveTo(0, 187); c.lineTo(89, 203); c.lineTo(147, 256); c.lineTo(0, 256); c.clip();
  for (let y = 188; y < HEIGHT; y += 9) for (let x = -25 + (y % 2) * 12; x < 155; x += 27) {
    box(x, y, 25, 8, ['#3f4545', '#454b49', '#373e40'][Math.floor(random() * 3)]);
    box(x + 1, y, 24, 1, '#71766b55');
    if (random() > .4) box(x + 4, y + 4, 10 + random() * 8, 1, '#85907b28');
  }
  box(12, 222, 41, 3, '#1d3540'); box(19, 220, 27, 1, '#64796c');
  box(60, 246, 44, 2, '#172d39');
  c.restore();
  stroke(0, 183, 91, 199, '#7b8071'); stroke(91, 199, 152, 255, '#657467');
  for (let i = 0; i < 6; i++) {
    const x = i * 17, y = 183 + i * 3;
    box(x, y - 20, 2, 21, '#111d29'); box(x, y - 21, 3, 1, '#69756a');
  }
  stroke(0, 165, 87, 181, '#172832'); stroke(0, 166, 87, 182, '#5c7068');
  stroke(0, 178, 87, 194, '#162631');

  // Foreground right: diagonal plank landing, rope and iron mooring posts.
  shape([[328, 171], [384, 183], [384, 256], [207, 256]], '#2a3033');
  c.save(); c.beginPath(); c.moveTo(328, 172); c.lineTo(384, 184); c.lineTo(384, 256); c.lineTo(211, 256); c.clip();
  for (let i = 0; i < 24; i++) {
    const y = 172 + i * 6;
    shape([[200, y], [384, y + 23], [384, y + 28], [200, y + 5]], ['#575549', '#44483f', '#4e5045'][i % 3]);
    stroke(200, y, 384, y + 23, '#7c79614d');
    for (let n = 0; n < 5; n++) box(220 + random() * 164, y + random() * 6, 10 + random() * 20, 1, '#1d2b3044');
  }
  c.restore();
  stroke(328, 171, 207, 255, '#8e8970'); stroke(327, 174, 214, 255, '#626d5b');
  const post = (x: number, y: number, height: number) => {
    box(x - 3, y - height, 7, height, '#182832'); box(x - 2, y - height, 2, height, '#526255');
    box(x - 5, y - height, 11, 3, '#24343b'); box(x - 4, y - height, 9, 1, '#87917c');
    box(x - 5, y, 12, 2, '#14252e');
  };
  stroke(331, 162, 286, 191, '#7e7d64'); stroke(286, 191, 235, 223, '#7e7d64');
  stroke(331, 163, 308, 185, '#4a584e'); stroke(308, 185, 286, 192, '#4a584e');
  stroke(286, 192, 258, 218, '#4a584e'); stroke(258, 218, 235, 224, '#4a584e');
  post(331, 177, 17); post(286, 208, 21); post(235, 244, 25);

  const lamp = (x: number, foot: number, height: number) => {
    const top = foot - height;
    // Hard-edged dithered halos stay in the same pixel language as the scenery.
    for (let yy = -28; yy <= 28; yy++) for (let xx = -28; xx <= 28; xx++) {
      const distance = Math.sqrt(xx * xx + yy * yy);
      if (distance < 28 && (xx + yy) % (distance > 16 ? 4 : 2) === 0)
        box(x + xx, top + 9 + yy, 1, 1, distance < 13 ? '#d2ac5736' : '#c29c4c16');
    }
    box(x - 2, top + 17, 5, height - 17, '#101e29'); box(x - 1, top + 18, 1, height - 18, '#667060');
    box(x - 5, foot - 5, 11, 5, '#17262f'); box(x - 7, foot - 1, 15, 3, '#101d27');
    box(x - 6, top + 4, 13, 14, '#1b2b32');
    box(x - 4, top + 6, 9, 10, '#c7a465'); box(x - 2, top + 7, 5, 7, '#f0d49a');
    box(x, top + 5, 1, 12, '#65705a'); box(x - 6, top + 17, 13, 2, '#566351');
    shape([[x - 8, top + 4], [x - 4, top], [x + 4, top], [x + 8, top + 4]], '#14232d');
    box(x, top - 3, 1, 3, '#879078');
  };
  lamp(46, 216, 104);
  lamp(351, 203, 74);
  // A narrow vertical hint of lantern light on wet foreground stones.
  for (let i = 0; i < 12; i++) box(40 - random() * i * .4, 220 + i * 3, 4 + random() * i, 1, '#c3a66936');
  return canvas;
}

export function drawTitleBackground(context: CanvasRenderingContext2D, time: number, motion: boolean) {
  painting ??= paintWaterfront();
  if (!frame) { frame = document.createElement('canvas'); frame.width = WIDTH; frame.height = HEIGHT; }
  const c = frame.getContext('2d')!;
  c.drawImage(painting, 0, 0);
  // Fog slides above the far bank. Reduced motion uses a fixed composition.
  const phase = motion ? time * .0008 : 0;
  for (let band = 0; band < 7; band++) {
    const drift = Math.round(Math.sin(phase + band) * 13);
    c.fillStyle = band % 2 ? '#a1b1a00b' : '#a1b1a011';
    c.fillRect(-45 + band * 54 + drift, 109 + band * 3, 104, 2);
    c.fillRect(-27 + band * 54 + drift, 111 + band * 3, 64, 1);
  }
  if (motion) {
    c.fillStyle = '#c2d0bd25';
    for (let i = 0; i < 44; i++) {
      const x = Math.floor((i * 61 + time * .006) % WIDTH), y = Math.floor((i * 43 + time * .061) % HEIGHT);
      c.fillRect(x, y, 1, 3);
    }
    c.fillStyle = '#b6b68a30';
    for (let i = 0; i < 11; i++) c.fillRect(18 + i * 33 + Math.round(Math.sin(phase + i) * 3), 133 + i * 7, 5 + i % 4, 1);
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(frame, 0, 0, context.canvas.width, context.canvas.height);
}
