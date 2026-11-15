/* Syntax-checks every JavaScript file, so new files are covered automatically. */
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = ['public', 'scripts', 'server', 'api'].flatMap(dir =>
  fs.readdirSync(path.join(root, dir)).filter(f => /\.(c?js)$/.test(f)).map(f => path.join(dir, f)));
for (const file of files) execFileSync(process.execPath, ['--check', path.join(root, file)], {stdio: 'inherit'});
console.log(`Checked ${files.length} files.`);
