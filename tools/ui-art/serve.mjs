import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('art/concepts/v2_ui');
const mime={'.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.md':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8'};
http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
}).listen(4181,'127.0.0.1',()=>console.log('UI art preview, local only: http://127.0.0.1:4181/README.md'));
