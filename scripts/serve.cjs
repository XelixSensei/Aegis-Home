const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

/* Load keys from a local .env file (never committed) without extra packages. */
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const root = path.resolve(__dirname, '../public');
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg'};
const api = {
  '/api/saathi': require('../api/saathi.js'),
  '/api/music': require('../api/music.js'),
  '/api/health': require('../api/health.js'),
};

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
}

http.createServer((request, response) => {
  securityHeaders(response);
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    return response.end('That address could not be read.');
  }
  if (api[pathname]) return api[pathname](request, response);
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(root, `.${pathname}`);
  const type = types[path.extname(file)];
  if (!file.startsWith(root + path.sep) || !type || !fs.existsSync(file)) {
    response.writeHead(404);
    return response.end('This page is not here.');
  }
  response.setHeader('Content-Type', `${type}; charset=utf-8`);
  response.setHeader('Cache-Control', 'no-store');
  const stream = fs.createReadStream(file);
  stream.on('error', () => {
    response.statusCode = 500;
    response.end('The file could not be opened.');
  });
  stream.pipe(response);
}).listen(port, host, () => {
  const ai = process.env.ANTHROPIC_API_KEY ? 'on' : 'off (offline Saathi)';
  const yt = process.env.YOUTUBE_API_KEY ? 'YouTube API' : process.env.ANTHROPIC_API_KEY ? 'AI web search' : 'off (YouTube links)';
  console.log(`Aegis Home is ready at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  console.log(`Live Saathi: ${ai} · Music search: ${yt}`);
});
