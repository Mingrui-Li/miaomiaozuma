import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mime = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.md':'text/plain; charset=utf-8' };
const server=http.createServer((req,res)=>{
  try{
    let url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(url==='/'){res.writeHead(302,{'Location':'/design/track-review/generated/catalog/index.html'});res.end();return;}
    const file=path.resolve(root,'.'+url);
    const allowed=url.startsWith('/design/track-review/')||url.startsWith('/tools/track-review/')||url==='/docs/TRACK_REDESIGN_REVIEW.md';
    if(!allowed||!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
});
server.listen(4180,'127.0.0.1',()=>console.log('100-level geometry review (local only): http://127.0.0.1:4180/design/track-review/generated/catalog/index.html'));
