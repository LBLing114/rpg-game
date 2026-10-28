import portraitUrl from './assets/portraits.png';
import buildingUrl from './assets/buildings.png';
import propUrl from './assets/props.png';

type Frame = readonly [number, number, number, number];
const sources = { portraits: portraitUrl, buildings: buildingUrl, props: propUrl };
type Atlas = keyof typeof sources;
const images = {} as Record<Atlas, HTMLImageElement>;

// Web builds cache the atlases separately; the standalone packer embeds them.
// Map caches are invalidated once after decoding, so no frame does image processing.
export const artReady = Promise.all(Object.entries(sources).map(async ([name, url]) => {
  const image = new Image();
  image.src = url;
  await image.decode();
  images[name as Atlas] = image;
}));

const buildings: Record<string, Frame> = {
  home: [20, 20, 608, 575], press: [640, 20, 608, 575],
  clinic: [20, 607, 608, 600], archive: [638, 607, 608, 600],
};
const props: Record<string, Frame> = {
  desk: [55, 43, 337, 289], bed: [472, 5, 215, 335],
  shelf: [806, 18, 310, 311], press: [1170, 32, 342, 290],
  medical: [80, 345, 248, 296], crate: [419, 348, 322, 293],
  bench: [780, 401, 382, 236], lamp: [1317, 316, 83, 323],
  stove: [90, 642, 228, 350], bicycle: [344, 688, 438, 285],
  curtain: [820, 657, 315, 313], boat: [1246, 642, 181, 367],
};

function blit(ctx: CanvasRenderingContext2D, atlas: Atlas, frame: Frame,
  x: number, y: number, width: number, height: number): boolean {
  const image = images[atlas];
  if (!image) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, ...frame, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  return true;
}

export function illustratedBuilding(ctx: CanvasRenderingContext2D, kind: string,
  x: number, y: number, width: number, height: number) {
  return blit(ctx, 'buildings', buildings[kind] ?? buildings.home, x, y, width, height);
}
export function illustratedProp(ctx: CanvasRenderingContext2D, kind: string,
  x: number, y: number, width: number, height: number) {
  return props[kind] ? blit(ctx, 'props', props[kind], x, y, width, height) : false;
}
export function illustratedPortrait(ctx: CanvasRenderingContext2D, kind: string) {
  const ids = ['shen', 'aunt', 'lin', 'doctor', 'gu'];
  const index = ids.indexOf(kind);
  if (index < 0) return false;
  // One upright bust per column. Source and destination share the same 3:5 ratio.
  const left = Math.round(index * 2172 / 5), right = Math.round((index + 1) * 2172 / 5);
  const drawn = blit(ctx, 'portraits', [left, 0, right - left, 724], 0, 0, ctx.canvas.width, ctx.canvas.height);
  if (drawn) { ctx.canvas.dataset.illustration = kind; ctx.canvas.dataset.artReady = 'true'; }
  return drawn;
}
