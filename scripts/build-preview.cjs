const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'public', name), 'utf8');
const html = read('index.html')
  .replace('<link rel="stylesheet" href="alarms.css">', () => `<style>${read('alarms.css')}</style>`)
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${read('style.css')}</style>`)
  .replace(/<link rel="stylesheet" href="medicines.css">/, () => `<style>${read('medicines.css')}</style>`)
  .replace(/<script src="([^"]+)"><\/script>/g, (_, file) => `<script>${read(file)}</script>`);

if (html.includes('src="app.js"') || html.includes('href="style.css"')) {
  throw new Error('The preview still references a separate source file.');
}
fs.mkdirSync(path.join(root, 'previews'), { recursive: true });
fs.writeFileSync(path.join(root, 'previews', 'step-3.html'), html);
console.log('Saved previews/step-3.html. Open it in your browser.');
