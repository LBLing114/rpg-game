import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Vite's output has no runtime imports or remote resources. Inline it so players
// can download one file and open it with file://, without Node.js or a server.
let html = await readFile('dist/index.html', 'utf8');
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !style) throw new Error('Expected Vite entry assets were not found');
const js = await readFile(resolve('dist', script[1]), 'utf8');
const css = await readFile(resolve('dist', style[1]), 'utf8');
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(style[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
const favicon = await readFile('public/favicon.svg');
html = html.replace(/href="[^"]*favicon\.svg"/, `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`);
await writeFile('play.html', html);
console.log('Standalone game written to play.html — open directly in a browser.');
