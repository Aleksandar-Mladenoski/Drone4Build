import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');
const zipOutputPath = path.resolve(projectRoot, 'drone4build-scorm12-flightlab.zip');

console.log('📦 Step 1: Building Vite production bundle with relative base paths...');
try {
  execSync('npx vite build', { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  console.error('❌ Vite build failed:', err);
  process.exit(1);
}

console.log('📄 Step 2: Creating SCORM 1.2 imsmanifest.xml in dist/ ...');

const imsManifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="DRONE4BUILD_AIRSPACE_SAFETY_LAB_SCORM12" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="DRONE4BUILD_ORG">
    <organization identifier="DRONE4BUILD_ORG">
      <title>Drone4Build - Airspace Safety &amp; EASA Regulations Flight Lab</title>
      <item identifier="ITEM_DRONE4BUILD_FLIGHT_LAB" identifierref="RES_DRONE4BUILD_FLIGHT_LAB">
        <title>Drone4Build Airspace Safety &amp; Regulations Practical Flight Lab</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_DRONE4BUILD_FLIGHT_LAB" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
`;

fs.writeFileSync(path.join(distDir, 'imsmanifest.xml'), imsManifestXml.trim(), 'utf-8');
console.log('✅ Created imsmanifest.xml successfully.');

console.log('🤐 Step 3: Packaging dist/ directory into SCORM ZIP file...');

const zip = new AdmZip();
zip.addLocalFolder(distDir);
zip.writeZip(zipOutputPath);

const stats = fs.statSync(zipOutputPath);
const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log(`\n🎉 SCORM 1.2 Package created successfully!`);
console.log(`📁 Package file: ${zipOutputPath}`);
console.log(`📊 Size: ${sizeInMB} MB`);
console.log(`\nReady to upload to OpenEdX (Ulmo), Moodle, Canvas, or any SCORM 1.2 compliant LMS!`);
