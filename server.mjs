// Local-only development server. Solo game is offline; this is NOT a multiplayer backend.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const entries=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/src/sim.mjs','src/sim.mjs'],['/src/render.mjs','src/render.mjs'],['/src/game.mjs','src/game.mjs'],['/dist/CROWNFOLD-RIFTFRONT.html','dist/CROWNFOLD-RIFTFRONT.html'],['/legacy/CROWNFOLD-ORIGINAL.html','legacy/CROWNFOLD-ORIGINAL.html']]);
for(const name of ['arsenal','settings','war-objectives','war-checkpoint','battlefield','battlefield-js','lineage','temporal','war','rpg','rust-tactics','rust-tactics-data'])entries.set(`/src/${name}.mjs`,`src/${name}.mjs`);
const MIME={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8'};
const port=Number(process.env.PORT||3040);const hostname=process.argv.includes('--lan')?'0.0.0.0':'127.0.0.1';
export async function handleRequest(req,res){const reqPath=new URL(req.url,'http://127.0.0.1').pathname,filename=entries.get(reqPath);if(!filename||!['GET','HEAD'].includes(req.method)){res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');return;}
  try{const data=await readFile(path.join(root,filename));res.writeHead(200,{'content-type':MIME[path.extname(filename).slice(1)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' data:; style-src 'self' 'unsafe-inline' data:; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",'x-frame-options':'DENY'});res.end(req.method==='HEAD'?null:data);}catch{res.writeHead(500);res.end('Server error');}
}
const server=http.createServer(handleRequest);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(port,hostname,()=>console.log(`CROWNFOLD RIFTFRONT on http://${hostname}:${port} (${hostname==='0.0.0.0'?'TRUSTED LAN MODE':'local-only'})`));
export {server};
