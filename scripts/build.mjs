import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=['rust-tactics-data','rust-tactics','battlefield-js','battlefield','lineage','temporal','war','rpg','sim','render','game'],imports={};
for(const name of sources){let source=await readFile(path.join(root,`src/${name}.mjs`),'utf8');for(const dep of sources)source=source.replaceAll(`'./${dep}.mjs'`,`'riftfront-${dep}'`);imports[`riftfront-${name}`]=`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;}
let html=await readFile(path.join(root,'index.html'),'utf8'),css=await readFile(path.join(root,'style.css'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`)
 .replace('<script type="module" src="src/game.mjs"></script>',`<script type="importmap">${JSON.stringify({imports})}</script><script type="module">import 'riftfront-game';</script>`)
 .replace('href="legacy/CROWNFOLD-ORIGINAL.html"','href="./CROWNFOLD-ORIGINAL.html"');
await mkdir(path.join(root,'dist'),{recursive:true});await writeFile(path.join(root,'dist','CROWNFOLD-RIFTFRONT.html'),html);
await writeFile(path.join(root,'dist','CROWNFOLD-ORIGINAL.html'),await readFile(path.join(root,'legacy/CROWNFOLD-ORIGINAL.html')));
console.log(`Built offline CrownFold.html (${Math.round(Buffer.byteLength(html)/1024)} KiB) and original-board companion.`);
