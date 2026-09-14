import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const files=[];
function collect(dir) {
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    if (item.name==='node_modules'||item.name==='dist'||item.name==='legacy') continue;
    const path=resolve(dir,item.name);
    if (item.isDirectory()) collect(path);
    else if (item.name.endsWith('.test.ts')||item.name.endsWith('.test.mjs')) files.push(path);
  }
}
collect(resolve('packages')); collect(resolve('apps')); collect(resolve('tools'));
const result=spawnSync(process.execPath,['--experimental-strip-types','--test',...files],{stdio:'inherit'});
process.exitCode=result.status??1;
