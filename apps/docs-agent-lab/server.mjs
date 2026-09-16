import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { concepts } from './catalog.js';

export const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const publicPaths = new Set([
  'index.html','app.js','shared.js','catalog.js','styles.css','favicon.svg',
  ...concepts.map(c=>c.route),
  ...Array.from({length:4},(_,i)=>[`pages/family-${i+1}.js`,`pages/family-${i+1}.css`]).flat(),
]);
export function isPublicPath(relative) {
  return publicPaths.has(relative);
}
export function makeServer(directory = root) {
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control','no-store');
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','no-referrer');
    response.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,{Allow:'GET, HEAD'}).end('Method not allowed'); return; }
    try {
      const url = new URL(request.url,'http://localhost');
      const relative = decodeURIComponent(url.pathname).slice(1) || 'index.html';
      if (!isPublicPath(relative)) throw Error('Not public');
      const filename = await realpath(path.join(directory,relative));
      const actualRoot = await realpath(directory);
      if (!filename.startsWith(actualRoot+path.sep) || !(await stat(filename)).isFile()) throw Error('Not a public file');
      const data = await readFile(filename);
      response.writeHead(200,{'Content-Type':mime[path.extname(filename)],'Content-Length':data.length});
      response.end(request.method==='HEAD'?undefined:data);
    } catch { response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port = Number(process.env.LAB_PORT || 4173);
  if (!Number.isInteger(port)||port<1||port>65535) throw Error('LAB_PORT must be between 1 and 65535');
  const server=makeServer();
  server.on('error', error=>{console.error(`Lab server: ${error.message}`);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`Docs Agent Lab: http://127.0.0.1:${port}/`));
}
