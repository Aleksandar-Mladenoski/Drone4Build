import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { validateZip } from './validate-scorm.mjs';

test('validator accepts a root manifest and packaged launch asset', () => {
  const dir=mkdtempSync(join(tmpdir(),'d4b-zip-'));
  try {
    const file=join(dir,'test.zip'), zip=new AdmZip();
    zip.addFile('imsmanifest.xml',Buffer.from('<?xml version="1.0"?><manifest><resources><resource href="index.html" adlcp:scormtype="sco"><file href="index.html"/><file href="assets/app.js"/></resource></resources></manifest>'));
    zip.addFile('index.html',Buffer.from('<html><script src="./assets/app.js"></script></html>'));
    zip.addFile('assets/app.js',Buffer.from('console.log(1)')); zip.writeZip(file);
    assert.deepEqual(validateZip(file).failures,[]);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('validator rejects absent referenced files', () => {
  const dir=mkdtempSync(join(tmpdir(),'d4b-zip-'));
  try {
    const file=join(dir,'test.zip'), zip=new AdmZip();
    zip.addFile('imsmanifest.xml',Buffer.from('<manifest><resources><resource href="index.html" adlcp:scormtype="sco"><file href="missing.js"/></resource></resources></manifest>'));
    zip.addFile('index.html',Buffer.from('<html></html>')); zip.writeZip(file);
    assert.match(validateZip(file).failures.join(' '),/missing referenced file/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
