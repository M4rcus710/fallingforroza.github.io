// A small local server that behaves like GitHub Pages:
// folders serve their index.html, /music redirects to /music/, and
// unknown addresses get 404.html.
//
//   npm run serve              http://localhost:8080
//   PORT=3000 npm run serve
//   node scripts/serve.js <dir>  serve another folder (e.g. a test build)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ics': 'text/calendar; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, file) {
  const stat = fs.statSync(file);
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Content-Length': stat.size,
    // always check for a newer version: you see your changes on reload
    'Cache-Control': 'no-cache',
    'Last-Modified': stat.mtime.toUTCString(),
  });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const requested = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!requested.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    let file = requested;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) send(res, 200, file);
    else send(res, 404, path.join(root, '404.html'));
  })
  .listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
