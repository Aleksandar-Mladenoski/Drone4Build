import { existsSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import AdmZip from 'adm-zip';
import { games } from './games.mjs';

const out = resolve('dist/scorm'); mkdirSync(out, { recursive: true });
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
for (const game of games) {
  const dir = resolve('dist/apps', game.id);
  if (!existsSync(resolve(dir, 'index.html'))) throw new Error(`Build ${game.code} first`);
  const content = files(dir).map(file => relative(dir, file).replaceAll('\\', '/'));
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>\n<manifest identifier="D4B-${game.code.replace('.', '-')}-SCORM12" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"><metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata><organizations default="ORG"><organization identifier="ORG"><title>${escape(game.title)}</title><item identifier="ITEM" identifierref="SCO"><title>${escape(game.title)}</title></item></organization></organizations><resources><resource identifier="SCO" type="webcontent" adlcp:scormtype="sco" href="index.html">${content.map(name => `<file href="${escape(name)}"/>`).join('')}</resource></resources></manifest>`;
  const zip = new AdmZip();
  zip.addFile('imsmanifest.xml', Buffer.from(manifest));
  for (const name of content) zip.addFile(name, readFileSync(resolve(dir, name)));
  zip.writeZip(resolve(out, game.zip));
  console.log(`${game.code}: ${game.zip}`);
}
