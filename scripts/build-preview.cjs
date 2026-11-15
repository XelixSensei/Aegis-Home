const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'public', name), 'utf8');
const html = read('index.html')
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${read('style.css')}</style>`)
  .replace('<script src="app.js"></script>', () => `<script>${read('app.js')}</script>`);

if (html.includes('src="app.js"') || html.includes('href="style.css"')) {
  throw new Error('The preview still references a separate source file.');
}
fs.mkdirSync(path.join(root, 'previews'), { recursive: true });
fs.writeFileSync(path.join(root, 'previews', 'step-1.html'), html);
console.log('Saved previews/step-1.html. Open it in your browser.');
