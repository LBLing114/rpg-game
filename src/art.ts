import { scenes } from "./story";
import { groundPosition } from "./engine";
import type { SceneId } from "./types";

// All artwork is original, drawn at a fixed pixel resolution. No external assets.
const W = 720,
  H = 400;
const colors = {
  ink: "#111b1d",
  brick: "#424a46",
  stone: "#67716a",
  warm: "#c6a669",
};
let ctx: CanvasRenderingContext2D;
let seed = 1;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function rect(x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}
function poly(points: number[][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function line(
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function glow(x: number, y: number, radius: number, strength = 0.24) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, radius);
  g.addColorStop(0, `rgba(224,177,93,${strength})`);
  g.addColorStop(1, "rgba(224,177,93,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function bricks(x: number, y: number, w: number, h: number, shade = "#404943") {
  rect(x, y, w, h, shade);
  for (let yy = y; yy < y + h; yy += 9) {
    line(x, yy, x + w, yy, "#232e2b");
    for (let xx = x + (Math.floor(yy / 9) % 2) * 11; xx < x + w; xx += 24) {
      line(xx, yy, xx, Math.min(yy + 9, y + h), "#27332e");
      if (rnd() > 0.5)
        rect(xx + 2, yy + 2, Math.min(18, x + w - xx), 1, "#556056");
    }
  }
  for (let i = 0; i < (w * h) / 100; i++)
    rect(
      x + rnd() * w,
      y + rnd() * h,
      2 + rnd() * 5,
      1,
      rnd() > 0.5 ? "#65706333" : "#0c1b1b44",
    );
}
function roof(x: number, y: number, w: number) {
  poly(
    [
      [x - 9, y + 12],
      [x + 4, y - 7],
      [x + w - 6, y - 7],
      [x + w + 12, y + 12],
    ],
    "#111e20",
  );
  for (let yy = 0; yy < 3; yy++)
    for (let xx = 0; xx < w + 10; xx += 9) {
      rect(x + xx - 4, y - 5 + yy * 6, 7, 4, yy % 2 ? "#37423d" : "#46514a");
      rect(x + xx - 3, y - 5 + yy * 6, 1, 5, "#697067");
    }
  rect(x - 10, y + 12, w + 24, 5, "#111d1e");
  rect(x - 9, y + 12, w + 21, 1, "#707369");
}
function windowAt(x: number, y: number, w: number, h: number, lit = false) {
  rect(x - 4, y - 4, w + 8, h + 9, "#1b2826");
  rect(x - 3, y - 4, w + 6, 3, "#6e7261");
  rect(x, y, w, h, lit ? "#b39863" : "#223330");
  if (lit) {
    rect(x + 2, y + 2, w - 4, h - 4, "#d6b773");
    rect(x + 3, y + 2, 5, h - 4, "#a58a54");
    glow(x + w / 2, y + h / 2, 52, 0.13);
  } else {
    rect(x + 2, y + 2, w - 4, 3, "#52635a");
    for (let iy = 6; iy < h; iy += 5) rect(x + 2, y + iy, w - 4, 2, "#3e4d43");
  }
  rect(x + w / 2 - 1, y, 2, h, "#1c2928");
  rect(x, y + h * 0.52, w, 3, "#29312a");
  rect(x - 5, y + h + 1, w + 10, 4, "#626c5e");
  rect(x - 5, y + h + 5, w + 10, 2, "#182724");
}
function door(x: number, y: number, w: number, h: number, lit = false) {
  rect(x - 7, y - 8, w + 14, h + 12, "#77796a");
  rect(x - 4, y - 4, w + 8, h + 8, "#283330");
  rect(x, y, w, h, "#111e1c");
  rect(x + 3, y + 3, w - 6, h - 6, lit ? "#917447" : "#34443c");
  for (let i = 5; i < w; i += 8)
    rect(x + i, y + 3, 2, h - 6, lit ? "#645337" : "#25342e");
  rect(x + w * 0.5, y, 3, h, "#151f1c");
  rect(x + 7, y + 13, w - 14, 3, "#182824");
  rect(x + 7, y + h * 0.6, w - 14, 3, "#1c2a23");
  rect(x + w * 0.5 - 5, y + h * 0.55, 2, 5, "#bcab77");
  rect(x - 9, y + h, w + 18, 4, "#6d7366");
  rect(x - 12, y + h + 4, w + 24, 5, "#414e46");
  if (lit) {
    poly(
      [
        [x, y + h],
        [x + w, y + h],
        [x + w + 48, y + h + 72],
        [x - 25, y + h + 72],
      ],
      "#d3af6112",
    );
    glow(x + w / 2, y + h / 2, 83, 0.15);
  }
}
function sign(x: number, y: number, w: number, text: string, small = false) {
  rect(x - 2, y - 2, w + 4, 24, "#1b2824");
  rect(x, y, w, 20, "#847858");
  rect(x + 2, y + 2, w - 4, 16, "#293a33");
  ctx.fillStyle = "#d2be88";
  ctx.font = `${small ? 10 : 13}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + 15);
}
function lantern(x: number, y: number) {
  line(x, y - 12, x, y, "#151f1b", 2);
  rect(x - 6, y, 12, 16, "#6b4930");
  rect(x - 5, y + 2, 10, 12, "#b38a4d");
  rect(x - 2, y + 2, 3, 12, "#edd49a");
  rect(x - 6, y - 1, 12, 2, "#1c2822");
  rect(x - 6, y + 15, 12, 3, "#252c21");
  glow(x, y + 7, 70, 0.32);
}
function papers(x: number, y: number) {
  for (let i = 0; i < 5; i++) {
    const xx = x + (i % 3) * 19,
      yy = y + Math.floor(i / 3) * 24;
    rect(xx, yy, 17, 25, i % 2 ? "#a19772" : "#968d6d");
    rect(xx + 2, yy + 3, 13, 3, "#614b3d");
    for (let j = 9; j < 22; j += 4)
      rect(xx + 3, yy + j, 9 + (j % 3), 1, "#5b6050");
  }
}
function street() {
  rect(0, 211, W, 189, "#34433f");
  for (let y = 212; y < 410; ) {
    const h = Math.max(4, (y - 185) / 16);
    const scale = (y - 170) / 75;
    line(0, y, W, y, "#1e302d");
    line(0, y + 1, W, y + 1, "#53605766");
    for (let x = -40; x < 760; x += 26 * scale) {
      const xx = x + (Math.floor(y) % 2) * 13;
      line(xx, y, xx - 5, y + h, "#20352f");
      if (rnd() > 0.6) rect(xx + 3, y + 3, 15 * scale, 1, "#7c867140");
    }
    y += h;
  }
  poly(
    [
      [310, 215],
      [361, 215],
      [265, 400],
      [189, 400],
    ],
    "#8a8b6a16",
  );
  for (let i = 0; i < 230; i++) {
    const x = rnd() * W,
      y = 233 + rnd() * 163;
    rect(x, y, 3 + rnd() * 22, 1, rnd() > 0.6 ? "#aab09a30" : "#172c2c60");
  }
  for (let i = 0; i < 50; i++)
    rect(135 + rnd() * 45, 270 + rnd() * 115, 8 + rnd() * 22, 1, "#c1a66b22");
}
function bicycle(x: number, y: number) {
  ctx.strokeStyle = "#152724";
  ctx.lineWidth = 2;
  for (const xx of [x, x + 31]) {
    ctx.beginPath();
    ctx.arc(xx, y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  line(x, y, x + 13, y - 21, "#7a7d66", 2);
  line(x, y, x + 22, y, "#7a7d66", 2);
  line(x + 13, y - 21, x + 22, y, "#7a7d66", 2);
  line(x + 22, y, x + 26, y - 23, "#7a7d66", 2);
  line(x + 26, y - 23, x + 31, y, "#7a7d66", 2);
  line(x + 9, y - 23, x + 18, y - 23, "#121f1e", 3);
  line(x + 26, y - 23, x + 22, y - 28, "#727963", 2);
}
function crate(x: number, y: number, w = 28, h = 23) {
  rect(x, y, w, h, "#534d37");
  rect(x + 2, y + 2, w - 4, h - 4, "#6e6548");
  for (let i = 6; i < h; i += 7) rect(x + 2, y + i, w - 4, 2, "#3b4231");
  rect(x + 3, y, 3, h, "#928365");
  rect(x + w - 5, y, 3, h, "#928365");
}
function lane() {
  rect(0, 0, W, H, "#233433");
  for (let i = 0; i < 11; i++) {
    const x = i * 79 - 20,
      y = 30 + rnd() * 70;
    rect(x, y, 74, 190, "#2c3d38");
    roof(x, y, 74);
    for (let j = 0; j < 3; j++) windowAt(x + 12 + j * 22, y + 24, 12, 24);
  }
  street();
  bricks(200, 88, 238, 131, "#50594d");
  roof(196, 81, 246);
  windowAt(222, 109, 28, 38, true);
  windowAt(270, 109, 24, 38);
  door(326, 156, 41, 66, true);
  windowAt(382, 113, 28, 37);
  sign(316, 134, 61, "槐 生 里", true);
  poly(
    [
      [0, 36],
      [196, 57],
      [215, 266],
      [0, 287],
    ],
    "#192a27",
  );
  bricks(-8, 48, 203, 215, "#454c40");
  roof(-8, 42, 206);
  rect(5, 149, 185, 6, "#85826a");
  rect(5, 155, 185, 4, "#25382f");
  windowAt(22, 76, 37, 55);
  windowAt(88, 76, 37, 55, true);
  windowAt(148, 81, 31, 50);
  door(143, 179, 38, 77, true);
  windowAt(31, 186, 65, 48);
  sign(133, 159, 61, "沈 宅", true);
  rect(117, 55, 4, 201, "#222e27");
  rect(118, 55, 1, 201, "#787761");
  bricks(196, 159, 49, 94, "#626958");
  roof(192, 153, 55);
  door(207, 184, 25, 65);
  lantern(196, 178);
  bricks(451, 24, 283, 245, "#4b5144");
  roof(442, 17, 290);
  rect(451, 144, 283, 5, "#85816a");
  rect(451, 150, 283, 7, "#26362c");
  windowAt(473, 55, 39, 63, true);
  windowAt(542, 55, 40, 63);
  windowAt(610, 55, 39, 63, true);
  windowAt(679, 55, 34, 63);
  papers(462, 170);
  door(548, 183, 42, 79, true);
  sign(531, 156, 80, "长明印刷");
  windowAt(620, 182, 69, 56);
  lantern(608, 163);
  rect(701, 39, 5, 224, "#27322a");
  rect(702, 39, 1, 224, "#827b61");
  rect(253, 168, 32, 6, "#302d23");
  rect(257, 174, 24, 45, "#8b8060");
  for (let y = 180; y < 214; y += 7) rect(262, y, 15, 2, "#544e39");
  crate(624, 254, 33, 24);
  crate(657, 252, 27, 27);
  crate(644, 233, 26, 21);
  bicycle(100, 264);
  rect(269, 228, 22, 5, "#877a54");
  rect(273, 233, 3, 17, "#302d24");
  rect(286, 233, 3, 17, "#302d24");
  ctx.strokeStyle = "#0e2021";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 38);
  ctx.quadraticCurveTo(360, 125, 730, 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(178, 97);
  ctx.quadraticCurveTo(346, 131, 470, 90);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = 278 + i * 31,
      y = 110 + Math.sin(i) * 6;
    rect(x, y, 19, 29, ["#8e8e76", "#656d5d", "#a2a18a", "#676955"][i]);
    rect(x + 3, y + 2, 2, 25, "#c2bba02a");
    rect(x, y - 3, 3, 5, "#433f2f");
  }
  // A distant bicycle, scattered leaves, a drain and puddles, rather than grass.
  rect(430, 308, 48, 14, "#1b2b29");
  for (let x = 433; x < 475; x += 5) rect(x, 309, 2, 10, "#506058");
  for (let i = 0; i < 18; i++)
    rect(rnd() * W, 275 + rnd() * 120, 3, 2, "#82724988");
  poly(
    [
      [497, 270],
      [538, 277],
      [566, 294],
      [523, 301],
      [472, 290],
    ],
    "#162e2d88",
  );
}
function floor() {
  rect(44, 208, 632, 175, "#514e3c");
  for (let y = 211; y < 390; y += 13) {
    rect(44, y, 632, 1, "#212c24");
    rect(44, y + 2, 632, 1, "#867a5633");
    for (let x = 48 + (y % 4) * 30; x < 676; x += 100) {
      rect(x, y, 1, 13, "#263026");
      rect(x + 9, y + 7, 45, 1, "#a4915b11");
    }
  }
  poly(
    [
      [47, 209],
      [110, 209],
      [44, 365],
    ],
    "#111f2399",
  );
}
function interiorBase(id: SceneId) {
  rect(0, 0, W, H, "#132322");
  rect(30, 29, 660, 334, "#27352d");
  bricks(44, 42, 632, 175, id === "clinic" ? "#49584e" : "#485044");
  rect(44, 186, 632, 29, "#333d30");
  for (let x = 46; x < 676; x += 12) rect(x, 188, 2, 25, "#555a43");
  floor();
  rect(30, 25, 660, 15, "#19251f");
  rect(30, 25, 660, 3, "#6f7054");
  rect(30, 40, 14, 320, "#222d23");
  rect(676, 40, 14, 320, "#222d23");
  for (let x = 44; x < 680; x += 159) {
    rect(x, 40, 8, 175, "#1f2c23");
    rect(x + 1, 40, 2, 175, "#686951");
  }
  rect(31, 364, 659, 14, "#16231e");
  rect(44, 363, 632, 3, "#69694c");
  // Lamp cord and a warm pool of light.
  line(355, 26, 355, 104, "#0c1918", 2);
  poly(
    [
      [350, 100],
      [360, 100],
      [371, 110],
      [339, 110],
    ],
    "#8d8156",
  );
  rect(346, 110, 18, 4, "#e0c17c");
  glow(355, 151, 160, 0.25);
  rect(320, 356, 76, 24, "#364339");
  rect(322, 358, 72, 2, "#82836a");
}
function table(x: number, y: number, w: number, h = 27) {
  rect(x, y, w, h, "#66563b");
  rect(x + 2, y + 2, w - 4, 3, "#a28b5d");
  rect(x, y + h, w, 5, "#2d3224");
  rect(x + 5, y + h + 5, 6, 22, "#453d2c");
  rect(x + w - 12, y + h + 5, 6, 22, "#453d2c");
}
function bookcase(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, "#252c20");
  rect(x, y, 5, h, "#82704b");
  rect(x + w - 5, y, 5, h, "#82704b");
  for (let yy = y + 5; yy < y + h - 8; yy += 30) {
    for (let xx = x + 7; xx < x + w - 7; xx += 7) {
      const c = ["#887d58", "#554f35", "#4e6151", "#9b8961", "#714a3b"][
        Math.floor(rnd() * 5)
      ];
      rect(xx, yy + 4 + rnd() * 5, 5, 19, c);
      rect(xx + 1, yy + 8, 3, 1, "#c0ac7344");
    }
    rect(x + 3, yy + 25, w - 6, 4, "#7a6642");
  }
}
function room(id: SceneId) {
  interiorBase(id);
  if (id === "home") {
    windowAt(92, 72, 71, 99, true);
    rect(84, 70, 10, 113, "#4f5d4e");
    rect(163, 70, 15, 113, "#4f5d4e");
    poly(
      [
        [94, 174],
        [163, 174],
        [286, 317],
        [160, 322],
      ],
      "#c0ad5a13",
    );
    table(166, 194, 119, 28);
    rect(181, 187, 33, 5, "#b7ad85");
    rect(188, 184, 27, 4, "#cebf8e");
    rect(252, 182, 10, 12, "#212e24");
    line(257, 182, 260, 170, "#796b45", 2);
    rect(445, 91, 51, 104, "#6e674c");
    rect(450, 96, 41, 93, "#78847a");
    rect(455, 100, 31, 84, "#455d55");
    line(463, 96, 474, 139, "#b7baa0");
    line(474, 139, 461, 164, "#1d302c");
    line(474, 139, 488, 172, "#a9af96");
    bookcase(526, 97, 104, 108);
    rect(523, 204, 110, 7, "#857451");
    rect(90, 242, 66, 46, "#3e3c2d");
    rect(86, 238, 74, 12, "#625a3e");
    rect(121, 244, 7, 11, "#a38c52");
    rect(521, 252, 105, 53, "#2c3427");
    rect(525, 251, 97, 42, "#8b8a70");
    for (let y = 257; y < 293; y += 7) rect(525, y, 97, 2, "#6b7561");
    rect(532, 253, 23, 12, "#b9b499");
    rect(520, 297, 7, 22, "#514530");
    rect(620, 297, 7, 22, "#514530");
    papers(302, 86);
    rect(312, 79, 43, 3, "#696b4d");
  } else if (id === "press") {
    bookcase(91, 78, 155, 110);
    table(174, 194, 111, 31);
    for (let x = 181; x < 275; x += 9)
      for (let y = 195; y < 219; y += 7)
        rect(x, y, 6, 4, rnd() > 0.5 ? "#a6a18a" : "#303e33");
    rect(324, 170, 73, 69, "#172824");
    rect(329, 167, 62, 17, "#75816c");
    rect(337, 185, 46, 9, "#99977a");
    rect(341, 201, 40, 24, "#3b4c3d");
    rect(334, 235, 6, 19, "#121f1b");
    rect(382, 235, 6, 19, "#121f1b");
    ctx.strokeStyle = "#87917a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(318, 200, 20, 0, Math.PI * 2);
    ctx.stroke();
    for (let a = 0; a < 6; a++)
      line(
        318,
        200,
        318 + Math.cos(a) * 18,
        200 + Math.sin(a) * 18,
        "#87917a",
        2,
      );
    table(480, 180, 127);
    for (let i = 0; i < 8; i++)
      rect(490 + i * 2, 175 - i * 3, 48, 3, i % 2 ? "#aea783" : "#c0b68d");
    rect(557, 172, 28, 7, "#1d2f29");
    windowAt(510, 72, 89, 67, true);
    sign(316, 65, 100, "长明 · 印务");
    crate(112, 269, 42, 29);
    crate(148, 275, 40, 27);
    papers(590, 261);
  } else if (id === "clinic") {
    rect(86, 71, 89, 107, "#718271");
    for (let y = 83; y < 173; y += 23) {
      rect(92, y, 77, 2, "#334739");
      for (let x = 99; x < 164; x += 16) {
        rect(x, y - 13, 8, 13, "#9b9d7b");
        rect(x + 2, y - 16, 4, 3, "#3c4430");
      }
    }
    table(199, 194, 101);
    rect(214, 190, 28, 4, "#bab591");
    rect(262, 182, 12, 13, "#889d84");
    rect(265, 179, 5, 3, "#282f26");
    windowAt(496, 72, 98, 87, true);
    rect(480, 65, 13, 132, "#75816d");
    rect(598, 65, 15, 135, "#75816d");
    for (let x = 481; x < 492; x += 4) rect(x, 67, 2, 129, "#a2a58a33");
    rect(439, 243, 59, 16, "#4a4431");
    rect(445, 258, 6, 22, "#514934");
    rect(486, 258, 6, 22, "#514934");
    rect(532, 233, 94, 48, "#2b392d");
    rect(535, 230, 88, 42, "#aaa98b");
    for (let y = 239; y < 270; y += 9) rect(535, y, 88, 2, "#818c74");
    rect(545, 229, 27, 14, "#d0c6a2");
    rect(530, 275, 6, 22, "#63715f");
    rect(622, 275, 6, 22, "#63715f");
    rect(350, 80, 29, 36, "#b6b295");
    rect(362, 85, 6, 25, "#8c5842");
    rect(352, 95, 26, 6, "#8c5842");
    rect(98, 271, 31, 35, "#26342b");
    rect(96, 270, 36, 6, "#65705a");
    rect(108, 283, 13, 10, "#aa6c3a");
    glow(114, 286, 46, 0.16);
  } else {
    bookcase(77, 66, 105, 140);
    bookcase(282, 66, 105, 140);
    bookcase(516, 66, 123, 140);
    table(391, 200, 108);
    rect(420, 194, 40, 8, "#cdc095");
    rect(419, 196, 1, 22, "#524c35");
    for (let y = 198; y < 215; y += 4) rect(425, y, 29, 1, "#807753");
    rect(224, 94, 34, 41, "#232e23");
    rect(227, 97, 28, 33, "#c0b68e");
    line(241, 113, 241, 101, "#4c4c36", 2);
    line(241, 113, 250, 116, "#4c4c36", 2);
    crate(89, 266, 71, 33);
    crate(114, 238, 50, 29);
    crate(537, 278, 63, 28);
    papers(187, 269);
  }
  for (let i = 0; i < 190; i++)
    rect(46 + rnd() * 629, 43 + rnd() * 163, 1, 1, "#d0c79b16");
}
function river() {
  rect(0, 0, W, H, "#223534");
  for (let i = 0; i < 30; i++) {
    const x = i * 27,
      y = 77 + rnd() * 68;
    rect(x, y, 22 + rnd() * 12, 92, "#2e4240");
    for (let j = 0; j < 4; j++)
      if (rnd() > 0.5)
        rect(
          x + 5 + (j % 2) * 9,
          y + 13 + Math.floor(j / 2) * 15,
          3,
          5,
          "#b6a06466",
        );
  }
  rect(0, 166, 720, 127, "#394b46");
  for (let i = 0; i < 530; i++)
    rect(
      rnd() * 720,
      169 + rnd() * 119,
      5 + rnd() * 21,
      1,
      rnd() > 0.5 ? "#7a8a7133" : "#162f3155",
    );
  for (let i = 0; i < 50; i++)
    rect(517 + rnd() * 36, 178 + rnd() * 86, 4 + rnd() * 16, 1, "#c4ac6733");
  poly(
    [
      [0, 292],
      [720, 268],
      [720, 400],
      [0, 400],
    ],
    "#464f43",
  );
  for (let y = 300; y < 400; y += 13) {
    line(0, y, 720, y - 23, "#253b32");
    for (let x = 0; x < 720; x += 49) line(x, y - 6, x + 4, y + 7, "#263a31");
  }
  rect(0, 278, 450, 6, "#8b8d70");
  for (let x = 17; x < 460; x += 75) {
    rect(x, 259, 9, 57, "#586958");
    rect(x - 2, 254, 13, 7, "#9a9b7d");
    rect(x + 2, 263, 2, 46, "#899079");
  }
  line(0, 269, 452, 269, "#4f6456", 3);
  poly(
    [
      [475, 238],
      [681, 238],
      [653, 265],
      [501, 265],
    ],
    "#182e2b",
  );
  rect(514, 220, 127, 23, "#64694d");
  rect(543, 196, 63, 27, "#485b49");
  windowAt(550, 202, 17, 15, true);
  windowAt(582, 202, 16, 15, true);
  rect(566, 182, 9, 16, "#223c33");
  poly(
    [
      [478, 260],
      [523, 260],
      [571, 321],
      [514, 321],
    ],
    "#7b7556",
  );
  for (let y = 266; y < 320; y += 8)
    line(480 + (y - 260) * 0.6, y, 523 + (y - 260) * 0.8, y, "#3d4b36", 2);
  rect(169, 146, 5, 153, "#1b302a");
  rect(163, 143, 18, 7, "#152a25");
  rect(164, 126, 15, 17, "#d9bd78");
  rect(167, 127, 2, 16, "#86703c");
  rect(161, 122, 21, 5, "#172b25");
  poly(
    [
      [162, 122],
      [170, 115],
      [180, 122],
    ],
    "#51604a",
  );
  glow(172, 136, 105, 0.25);
  for (let i = 0; i < 30; i++)
    rect(rnd() * 720, 120 + rnd() * 55, 140 + rnd() * 230, 2, "#bac4a50a");
  crate(632, 308, 43, 29);
  rect(43, 332, 74, 8, "#867650");
  rect(50, 340, 5, 15, "#343b2c");
  rect(105, 340, 5, 15, "#343b2c");
}

export function drawPerson(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  type = "shen",
  frame = 0,
  facing = 1,
  scale = 1,
) {
  const old = ctx;
  ctx = c;
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.scale(scale, scale);
  ctx.fillStyle = "#07181366";
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const coat =
    type === "shen"
      ? "#8e7c55"
      : type === "lin"
        ? "#6f8180"
        : type === "doctor"
          ? "#b4b3a0"
          : type === "gu"
            ? "#6c7163"
            : "#7a7b67";
  const step = frame ? Math.sin(frame) * 2 : 0;
  rect(-5, -9, 4, 10 + step, "#25302a");
  rect(2, -9, 4, 10 - step, "#25302a");
  rect(-6, 1 + step, 5, 2, "#0d1d1b");
  rect(2, 1 - step, 6, 2, "#0d1d1b");
  poly(
    [
      [-5, -25],
      [5, -25],
      [8, -9],
      [-8, -9],
    ],
    coat,
  );
  rect(-8, -23, 3, 12, "#535c4b");
  rect(6, -23, 3, 12, coat);
  rect(-8, -12, 3, 4, "#baa17b");
  rect(6, -12, 3, 4, "#baa17b");
  rect(-4, -34, 9, 9, "#bca17a");
  rect(-5, -36, 11, 5, type === "gu" ? "#949b87" : "#1b2927");
  rect(facing > 0 ? -5 : 4, -32, 3, 6, type === "gu" ? "#949b87" : "#1b2927");
  rect(facing > 0 ? 3 : -3, -31, 1, 1, "#262e25");
  if (type === "shen") {
    rect(-4, -25, 9, 3, "#aa9b75");
    rect(1, -23, 3, 9, "#aa9b75");
    rect(-7, -17, 5, 9, "#4c4533");
  }
  if (type === "aunt") {
    rect(-5, -37, 8, 3, "#8e9381");
    rect(-5, -21, 10, 11, "#979982");
  }
  if (type === "doctor") {
    rect(-4, -37, 9, 3, "#d2cfb2");
    rect(-1, -23, 2, 12, "#485a4a");
  }
  if (type === "gu") line(-6, -31, 7, -31, "#343d32");
  ctx.restore();
  ctx = old;
}

export class World {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  backgrounds = new Map<SceneId, HTMLCanvasElement>();
  scene: SceneId = "lane";
  x = 355;
  y = 278;
  keys = new Set<string>();
  target: { x: number; y: number; done?: () => void } | null = null;
  enabled = true;
  motion = true;
  last = 0;
  frame = 0;
  facing = 1;
  animation = 0;
  onPosition: (x: number, y: number) => void = () => {};
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.context = canvas.getContext("2d")!;
    this.context.imageSmoothingEnabled = false;
    this.render = this.render.bind(this);
    this.animation = requestAnimationFrame(this.render);
  }
  change(scene: SceneId, x = 355, y = 278) {
    this.scene = scene;
    Object.assign(this, groundPosition(scene, x, y));
    this.target = null;
    this.keys.clear();
  }
  move(x: number, y: number, done?: () => void) {
    this.target = {
      ...groundPosition(this.scene, x, y),
      done,
    };
  }
  background() {
    if (this.backgrounds.has(this.scene))
      return this.backgrounds.get(this.scene)!;
    const b = document.createElement("canvas");
    b.width = W;
    b.height = H;
    ctx = b.getContext("2d")!;
    seed = 42;
    if (this.scene === "lane") lane();
    else if (this.scene === "river") river();
    else room(this.scene);
    // Vignette is baked into the pixel canvas rather than a page-wide overlay.
    const g = ctx.createRadialGradient(363, 215, 90, 363, 215, 420);
    g.addColorStop(0, "#00000000");
    g.addColorStop(1, "#06101199");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    this.backgrounds.set(this.scene, b);
    return b;
  }
  render(time: number) {
    const dt = Math.min((time - this.last) / 1000, 0.045);
    this.last = time;
    const c = this.context;
    c.clearRect(0, 0, W, H);
    c.drawImage(this.background(), 0, 0);
    let dx = 0,
      dy = 0;
    if (this.enabled) {
      if (this.keys.has("arrowleft") || this.keys.has("a")) dx--;
      if (this.keys.has("arrowright") || this.keys.has("d")) dx++;
      if (this.keys.has("arrowup") || this.keys.has("w")) dy--;
      if (this.keys.has("arrowdown") || this.keys.has("s")) dy++;
      if (dx || dy) this.target = null;
      else if (this.target) {
        const vx = this.target.x - this.x,
          vy = this.target.y - this.y,
          d = Math.hypot(vx, vy);
        if (d < 4) {
          const cb = this.target.done;
          this.target = null;
          cb?.();
        } else {
          dx = vx / d;
          dy = vy / d;
        }
      }
      if (dx || dy) {
        const n = Math.hypot(dx, dy);
        Object.assign(this, groundPosition(this.scene,
          this.x + (dx / n) * dt * 115,
          this.y + (dy / n) * dt * 115));
        this.frame += dt * 12;
        if (dx) this.facing = dx > 0 ? 1 : -1;
        this.onPosition(this.x, this.y);
      } else this.frame = 0;
    }
    const people: { x: number; y: number; type: string }[] = [];
    for (const h of scenes.find((s) => s.id === this.scene)!.hotspots)
      if (h.kind === "person")
        people.push({
          x: h.x,
          y: h.y + 23,
          type:
            h.id === "aunt"
              ? "aunt"
              : h.id === "lin"
                ? "lin"
                : h.id === "doctor"
                  ? "doctor"
                  : "gu",
        });
    people.push({ x: this.x, y: this.y, type: "shen" });
    people.sort((a, b) => a.y - b.y);
    for (const p of people)
      drawPerson(
        c,
        p.x,
        p.y,
        p.type,
        p.type === "shen" ? this.frame : 0,
        this.facing,
      );
    ctx = c;
    // A small marker keeps the playable character readable in the rain.
    poly(
      [
        [this.x - 3, this.y - 45],
        [this.x, this.y - 48],
        [this.x + 3, this.y - 45],
        [this.x, this.y - 42],
      ],
      "#d9c596",
    );
    if (this.target) {
      ctx.strokeStyle = "#d4bf8677";
      ctx.strokeRect(this.target.x - 4, this.target.y - 2, 8, 4);
    }
    if ((this.scene === "lane" || this.scene === "river") && this.motion) {
      for (let i = 0; i < 97; i++) {
        const xx = (i * 79 + time * 0.023) % W,
          yy = (i * 37 + time * 0.19) % H;
        line(xx, yy, xx - 3, yy + 8, "#c1cec225");
      }
      for (let i = 0; i < 8; i++) {
        const phase = (time * 0.001 + i * 0.7) % 1;
        ctx.strokeStyle = `rgba(173,191,171,${(1 - phase) * 0.15})`;
        ctx.strokeRect(
          (i * 91 + 47) % W,
          297 + ((i * 23) % 97),
          2 + phase * 10,
          1 + phase * 3,
        );
      }
    }
    this.animation = requestAnimationFrame(this.render);
  }
}
