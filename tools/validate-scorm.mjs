import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import AdmZip from 'adm-zip';
import { createServer } from 'node:http';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { games } from './games.mjs';

export function validateZip(file) {
  const zip = new AdmZip(file);
  const entries = zip.getEntries();
  const names = new Set(entries.map(e => e.entryName));
  const failures = [];
  if (!names.has('imsmanifest.xml')) failures.push('manifest missing at root');
  if (!names.has('index.html')) failures.push('launch page missing');
  if (entries.some(e => /(^|\/)node_modules\/|\.(env|pem|key)(\.|$)/i.test(e.entryName))) failures.push('dependency or secret file included');
  for (const entry of entries) {
    if (/^[A-Za-z]:|^\//.test(entry.entryName) || entry.entryName.includes('..')) failures.push(`unsafe path: ${entry.entryName}`);
  }
  if (!failures.length) {
    const xml = zip.readAsText('imsmanifest.xml');
    const valid = XMLValidator.validate(xml);
    if (valid !== true) failures.push('malformed manifest XML');
    else {
      const manifest = new XMLParser({ ignoreAttributes: false }).parse(xml).manifest;
      const resource = manifest?.resources?.resource;
      if (!resource || Array.isArray(resource) || resource['@_href'] !== 'index.html' || resource['@_adlcp:scormtype'] !== 'sco') failures.push('invalid SCO resource');
      const refs = resource?.file ? (Array.isArray(resource.file) ? resource.file : [resource.file]) : [];
      for (const ref of refs) if (!names.has(ref['@_href'])) failures.push(`missing referenced file: ${ref['@_href']}`);
      const html = zip.readAsText('index.html');
      for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (/^(https?:|\/|[A-Za-z]:)/i.test(asset)) failures.push(`external or absolute launch asset: ${asset}`);
        else if (!names.has(asset.replace(/^\.\//, ''))) failures.push(`missing launch asset: ${asset}`);
      }
      for (const entry of entries.filter(e => /\.(js|css|html)$/i.test(e.entryName))) {
        const body = zip.readAsText(entry);
        if (/file:\/\/|C:\\Users\\|GEMINI_API_KEY|AIza[\w-]{20,}/i.test(body)) failures.push(`source secret or absolute path: ${entry.entryName}`);
      }
    }
  }
  return { failures, bytes: statSync(file).size, files: entries.length };
}

async function serveCheck(file) {
  const zip = new AdmZip(file);
  const server = createServer((request,response) => {
    const name = decodeURIComponent((request.url || '/').slice(1)) || 'index.html';
    const entry = zip.getEntry(name);
    if (!entry) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'application/javascript' });
    response.end(entry.getData());
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const port = server.address().port;
    for (const name of zip.getEntries().map(e=>e.entryName).filter(n=>/^(index\.html|assets\/.*\.(js|css))$/.test(n))) {
      const result = await fetch(`http://127.0.0.1:${port}/${name}`);
      if (!result.ok) throw new Error(`HTTP ${result.status} for ${name}`);
    }
  } finally { await new Promise(resolve=>server.close(resolve)); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  let failed = false;
  for (const game of games.filter(game => game.scorm)) {
    const file = resolve('dist/scorm', game.zip);
    if (!existsSync(file)) { console.error(`${game.code}: missing ZIP`); failed = true; continue; }
    const report = validateZip(file);
    if (!report.failures.length) {
      try { await serveCheck(file); } catch (error) { report.failures.push(`local serve check failed: ${error.message}`); }
    }
    console.log(`${game.code}: ${report.failures.length ? report.failures.join(', ') : 'valid'}; ${report.files} files; ${(report.bytes / 1024).toFixed(1)} KiB`);
    failed ||= report.failures.length > 0;
  }
  if (failed) process.exitCode = 1;
}
