const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../public');
const port = Number(process.env.PORT || 4174);
const routes = {
  '/medicines.css': ['medicines.css', 'text/css'],
  '/dose-ledger.js': ['dose-ledger.js', 'text/javascript'],
  '/medicines.js': ['medicines.js', 'text/javascript'],
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/app.js': ['app.js', 'text/javascript'],
  '/style.css': ['style.css', 'text/css'],
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    return response.end('That address could not be read.');
  }
  const route = routes[pathname];
  if (!route) {
    response.writeHead(404);
    return response.end('This page is not here.');
  }
  response.setHeader('Content-Type', `${route[1]}; charset=utf-8`);
  response.setHeader('Cache-Control', 'no-store');
  const stream = fs.createReadStream(path.join(root, route[0]));
  stream.on('error', () => {
    response.statusCode = 500;
    response.end('The preview file could not be opened.');
  });
  stream.pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Aegis Home is ready at http://127.0.0.1:${port}`);
});
