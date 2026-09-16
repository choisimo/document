import { mkdir, readdir, copyFile, rm, realpath, access } from 'node:fs/promises';
import path from 'node:path';
import { root, isPublicPath } from '../server.mjs';
import { concepts } from '../catalog.js';

const output=path.join(root,'dist');
const required = [
  'index.html','app.js','shared.js','catalog.js','styles.css','favicon.svg',
  ...concepts.map(c=>c.route),
  ...Array.from({length:4},(_,i)=>[`pages/family-${i+1}.js`,`pages/family-${i+1}.css`]).flat(),
];
for (const filename of required) {
  await access(path.join(root,filename));
  if (!(await realpath(path.join(root,filename))).startsWith(root+path.sep)) throw Error(`Refusing out-of-project source: ${filename}`);
}
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
let count=0;
for (const filename of await readdir(root,{recursive:true})) {
  if (!isPublicPath(filename)) continue;
  if (!(await realpath(path.join(root,filename))).startsWith(root+path.sep)) throw Error(`Refusing out-of-project source: ${filename}`);
  await mkdir(path.dirname(path.join(output,filename)),{recursive:true});
  await copyFile(path.join(root,filename),path.join(output,filename));count++;
}
console.log(`Built ${concepts.length} concept pages and gallery (${count} assets) into apps/docs-agent-lab/dist`);
