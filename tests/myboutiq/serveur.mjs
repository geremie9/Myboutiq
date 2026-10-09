/* Sert le dépôt comme Vercel le sert (vercel.json) :
   /conseils et /conseils/<page> sans .html, /join et /join/<code> vers
   join.html, /bar vers /bar/index.html, un dossier vers son index.html. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.sql': 'text/plain; charset=utf-8' };
export function demarrer(port, racine) {
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    if (u === '/bar') { res.writeHead(307, { Location: '/bar/index.html' }); res.end(); return; }
    if (u === '/join' || u.startsWith('/join/')) u = '/join.html';
    else if (/^\/conseils\/[a-z0-9-]+$/.test(u)) u += '.html';
    let p = path.join(racine, u);
    if (!p.startsWith(racine)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) { res.writeHead(404); res.end('introuvable'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
