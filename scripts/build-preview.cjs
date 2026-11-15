const fs = require('node:fs');
const path = require('node:path');

/* Inlines every stylesheet and script into one downloadable file: previews/<step>.html */
const root = path.resolve(__dirname, '..');
const step = process.argv[2] || require('../package.json').aegisStep;
if (!/^step-\d+$/.test(step || '')) throw new Error('Pass a step name, e.g. node scripts/build-preview.cjs step-4');
const read = name => fs.readFileSync(path.join(root, 'public', name), 'utf8');
const html = read('index.html')
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, file) => `<style>${read(file)}</style>`)
  // Local scripts are inlined; pinned CDN libraries (https) stay as links.
  .replace(/<script src="(?!https?:)([^"]+)"><\/script>/g, (_, file) => `<script>${read(file).replace(/<\/script/gi, '<\\/script')}</script>`);

if (/<script src="(?!https?:)|<link rel="stylesheet"/.test(html)) {
  throw new Error('The preview still references a separate source file.');
}
fs.mkdirSync(path.join(root, 'previews'), {recursive: true});
fs.writeFileSync(path.join(root, 'previews', `${step}.html`), html);
console.log(`Saved previews/${step}.html. Open it in your browser.`);
