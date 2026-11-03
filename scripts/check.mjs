import {execFileSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
for(const folder of ['src','scripts','tests'])for(const file of await readdir(folder))if(file.endsWith('.mjs')){execFileSync(process.execPath,['--check',`${folder}/${file}`],{stdio:'pipe'});console.log('PASS',folder+'/'+file);}
