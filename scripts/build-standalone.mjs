import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

// Keep web assets cacheable, then embed the same files for offline file:// play.
let html = await readFile('dist/index.html', 'utf8');
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !style) throw new Error('Expected Vite entry assets were not found');
const scriptPath = resolve('dist', script[1]);
let js = await readFile(scriptPath, 'utf8');
const css = await readFile(resolve('dist', style[1]), 'utf8');
// With base='./', Vite references imported images relative to import.meta.url.
// Inline these expressions before moving the script out of its assets directory.
const assetExpression = /new URL\("([^"\n]+\.png)",import\.meta\.url\)\.href/g;
for (const match of [...js.matchAll(assetExpression)]) {
  const bytes = await readFile(resolve(dirname(scriptPath), match[1]));
  js = js.replace(match[0], () => JSON.stringify(`data:image/png;base64,${bytes.toString('base64')}`));
}
if (/new URL\([^)]*import\.meta\.url/.test(js))
  throw new Error('An asset URL remains external; update the standalone packer.');
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(style[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
const favicon = await readFile('public/favicon.svg');
html = html.replace(/href="[^"]*favicon\.svg"/, `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`);
await writeFile('play.html', html);
console.log('Standalone game written to play.html — open directly in a browser.');
