import '../../../packages/core/src/ui.css';
import { createScorm } from '../../../packages/core/src/scorm.ts';
import { createTranslator } from '../../../packages/core/src/locale.ts';
import en from '../locales/en.json';
import { mount, newBuild, recordTest, removeSensor, testOutcome, type Build, type Part, type Platform, type Sensor, type TestOutcome } from './rules.ts';
import './style.css';

const scorm = createScorm('m1-1-mission-loadout');
const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const translator = createTranslator(en, dictionaries);
const t = translator.t;
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root unavailable');
document.title = `Drone4Build · ${t('title')}`;
document.documentElement.lang = translator.locale;

function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function tx(key: string, values?: Record<string, string | number>): string { return esc(t(key, values)); }
function isBuild(value: unknown): value is Build {
  if (!value || typeof value !== 'object') return false;
  const b = value as Partial<Build>;
  return (b.platform === null || b.platform === 'fixedWing' || b.platform === 'multirotor') &&
    (b.sensor === null || b.sensor === 'rgb' || b.sensor === 'thermal') &&
    (b.battery === 'low' || b.battery === 'charged') && typeof b.angle === 'number' &&
    typeof b.tests === 'number' && (b.lastTest === null || (typeof b.lastTest === 'object' && typeof b.lastTest?.success === 'boolean'));
}
let build = isBuild(scorm.load<unknown>()) ? scorm.load<Build>()! : newBuild();
let phase: 'bench' | 'test' = 'bench';
let held: Part | null = null;
let inspection = false;
let hint = '';
let running = false;
let frameId = 0;
let testStart = 0;
let testDone = false;
let captured = 0;
const TEST_MS = 9000;
function save() { scorm.save(build); }

function aircraft(platform: Platform | null) {
  if (platform === 'multirotor') return `<svg viewBox="0 0 280 220" class="craft-svg multirotor" aria-hidden="true"><g class="rotors"><circle cx="56" cy="45" r="31"/><circle cx="224" cy="45" r="31"/><circle cx="56" cy="175" r="31"/><circle cx="224" cy="175" r="31"/></g><g class="arms"><path d="M140 108 56 45M140 108l84-63M140 108 56 175M140 108l84 67"/></g><path class="aircraft-body" d="M109 70h62l17 37-17 43h-62l-17-43z"/><path class="nose" d="m127 72 13-20 13 20"/><path class="detail" d="M122 96h36m-36 18h36m-21 17h6"/></svg>`;
  if (platform === 'fixedWing') return `<svg viewBox="0 0 280 220" class="craft-svg fixedwing" aria-hidden="true"><path class="wing" d="M136 23h8l9 74 103 27v31l-103-9-7 53h-12l-7-53-103 9v-31l103-27z"/><path class="aircraft-body" d="M127 38h26l7 109-13 42h-14l-13-42z"/><path class="detail" d="M129 69h22m-24 16h26m-40 62h54"/></svg>`;
  return `<div class="empty-craft" aria-hidden="true">+</div>`;
}
function sensorArt(sensor: Sensor | null) {
  if (sensor === 'rgb') return `<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="12" y="18" width="66" height="45" rx="8"/><path d="m24 18 6-11h34l6 11"/><circle cx="45" cy="40" r="15"/><circle cx="45" cy="40" r="7"/></svg>`;
  if (sensor === 'thermal') return `<svg viewBox="0 0 90 70" aria-hidden="true"><rect x="12" y="16" width="66" height="47" rx="8"/><path d="M28 54c-9-13 10-14 0-32m16 34c-8-12 9-14 1-34m16 34c-9-13 9-17 2-34"/></svg>`;
  return `<div class="empty-socket">+</div>`;
}
function batteryArt(charged: boolean) { return `<span class="battery-shape ${charged ? 'charged' : 'low'}" aria-hidden="true"><span class="battery-cap"></span><span class="battery-level"></span><span class="battery-bolt">ϟ</span></span>`; }

function header() {
  const snap = scorm.snapshot();
  return `<header class="app-header"><div class="brand"><span class="brand-mark" aria-hidden="true">D<span>4</span>B</span><div><div class="eyebrow">${tx('course')}</div><div class="brand-title">${tx('title')} <span>${tx('subtitle')}</span></div></div></div><div class="lms-pill"><span class="status-dot" aria-hidden="true"></span><div>${tx(`status.${snap.mode}`)}<small>${tx('status.tests', { count: build.tests })}</small></div></div></header>`;
}
function item(part: Part, nameKey: string, detailKey: string, art: string) {
  return `<button type="button" draggable="true" class="part ${held === part ? 'held' : ''}" data-part="${part}" aria-pressed="${held === part}" aria-label="${tx(nameKey)}. ${tx(detailKey)}"><span class="part-art">${art}</span><span class="part-name">${tx(nameKey)}</span><span class="part-detail">${tx(detailKey)}</span></button>`;
}
function bench() {
  const last = build.lastTest;
  return `<div class="game-layout"><section class="mission-banner"><div><div class="eyebrow">${tx('slice')}</div><h1>${tx('mission.title')}</h1><p>${tx('mission.brief')}</p></div><div class="target-chip"><span aria-hidden="true">▥</span><div><strong>${tx('mission.target')}</strong><small>${tx('mission.targetDetail')}</small></div></div></section>
  <div class="workshop"><aside class="parts-rack panel"><div class="rack-heading"><span>01</span><div><h2>${tx('rack.platforms')}</h2><p>${tx('rack.platformHint')}</p></div></div>${item('platform:multirotor', 'platform.multirotor', 'platform.multirotor.detail', aircraft('multirotor'))}${item('platform:fixedWing', 'platform.fixedWing', 'platform.fixedWing.detail', aircraft('fixedWing'))}<div class="rack-divider"></div><div class="rack-heading"><span>02</span><div><h2>${tx('rack.payloads')}</h2><p>${tx('rack.payloadHint')}</p></div></div>${item('sensor:rgb', 'sensor.rgb', 'sensor.rgb.detail', sensorArt('rgb'))}${item('sensor:thermal', 'sensor.thermal', 'sensor.thermal.detail', sensorArt('thermal'))}</aside>
  <main class="bench panel"><div class="bench-top"><div><div class="eyebrow">${tx('bench.label')}</div><h2>${tx('bench.title')}</h2></div><div class="bench-steps">${tx('bench.help')}</div></div><div class="turntable" id="turntable" style="--angle:${build.angle}deg"><div class="turntable-rings"></div><button type="button" class="platform-slot snap-zone" data-slot="platform" aria-label="${tx('bench.platformSlot')}"><span class="craft-wrap">${aircraft(build.platform)}</span></button><div class="craft-shadow"></div><div class="socket-row"><button type="button" class="sensor-slot snap-zone" data-slot="sensor" aria-label="${tx('bench.sensorSlot')}">${sensorArt(build.sensor)}<span>${build.sensor ? tx(`sensor.${build.sensor}`) : tx('bench.emptyPayload')}</span></button><button type="button" class="battery-slot snap-zone ${build.battery}" data-slot="battery" aria-label="${tx('bench.batterySlot')}">${batteryArt(build.battery === 'charged')}<span>${tx(`battery.${build.battery}`)}</span></button></div></div><div class="bench-controls"><div class="rotate-controls"><span>${tx('bench.rotate')}</span><button type="button" data-action="rotate-left" aria-label="${tx('bench.rotateLeft')}">↶</button><button type="button" data-action="rotate-right" aria-label="${tx('bench.rotateRight')}">↷</button></div><button type="button" data-action="remove-sensor" ${build.sensor ? '' : 'disabled'}>${tx('bench.unmount')}</button><button type="button" data-action="inspect-battery">${tx('bench.inspectBattery')}</button></div><div class="bench-message" role="status">${inspection ? `<strong>${tx(`battery.${build.battery}.title`)}</strong> ${tx(`battery.${build.battery}.inspect`)}` : hint ? esc(hint) : tx('bench.defaultHint')}</div><div class="test-controls"><div><div class="eyebrow">${tx('test.label')}</div><p>${last ? tx(last.success ? 'test.lastSuccess' : 'test.lastFailure') : tx('test.firstHint')}</p></div><button type="button" class="btn-primary test-button" data-action="test" ${build.platform && build.sensor ? '' : 'disabled'}>${tx('test.launch')} <span aria-hidden="true">→</span></button></div></main>
  <aside class="parts-rack service-rack panel"><div class="rack-heading"><span>03</span><div><h2>${tx('rack.service')}</h2><p>${tx('rack.serviceHint')}</p></div></div>${item('battery:charged', 'battery.spare', 'battery.spare.detail', batteryArt(true))}<div class="schematic"><div class="schematic-title">${tx('schematic.title')}</div><div class="schematic-building"><div class="schematic-windows"></div><div class="schematic-crack"></div></div><p>${tx('schematic.body')}</p></div></aside></div></div>`;
}
function testView(outcome: TestOutcome) {
  return `<div class="test-layout"><div class="test-heading"><div><div class="eyebrow">${tx('test.label')}</div><h1>${tx('test.title')}</h1><p>${tx('test.subtitle')}</p></div><div class="test-run">${tx('test.run', { count: build.tests + 1 })}</div></div><div class="test-grid"><div class="test-stage" id="test-stage"><div class="test-sky"><div class="sun"></div><div class="cloud c1"></div><div class="cloud c2"></div></div><div class="test-ground"></div><div class="test-building"><div class="roof"></div><div class="facade-lines"></div><div class="facade-windows"></div><div class="facade-crack"></div></div><div class="target-outline"></div><div class="flight-track ${outcome.hover ? 'hover-track' : 'sweep-track'}"></div><div class="test-craft" id="test-craft">${aircraft(build.platform)}<span class="test-camera ${build.sensor}">${sensorArt(build.sensor)}</span></div><div class="scan-beam ${outcome.visual ? 'rgb' : 'thermal'}" id="scan-beam"></div><div class="test-abort" id="test-abort">${tx('test.abort')}</div><div class="scene-caption" id="scene-caption" role="status">${tx('test.takingOff')}</div></div><div class="test-side panel"><div class="eyebrow">${tx('test.captureLabel')}</div><h2>${tx('test.captureTitle')}</h2><div class="capture-grid" id="capture-grid">${Array.from({ length: 6 }, (_, index) => `<div class="capture-cell" data-cell="${index}"><span>${index + 1}</span></div>`).join('')}</div><div class="test-progress"><div id="test-progress-bar"></div></div><div class="test-observation" id="test-observation" role="status">${tx('test.observing')}</div><button type="button" class="return-button" data-action="return">${tx('test.return')}</button></div></div></div>`;
}
function render() {
  const outcome = testOutcome(build);
  app!.innerHTML = `<div class="shell">${header()}${phase === 'bench' ? bench() : testView(outcome)}</div>`;
}
function setHint(key: string) { hint = t(key); inspection = false; render(); }
function applyPart(part: Part) {
  build = mount(build, part); held = null; inspection = false; hint = t('bench.mounted'); save(); render();
}
function startTest() {
  if (!build.platform || !build.sensor) return;
  phase = 'test'; running = true; testDone = false; captured = 0; testStart = performance.now(); render();
  frameId = requestAnimationFrame(animateTest);
}
function captureCell(cell: HTMLElement, outcome: TestOutcome) {
  const kind = !outcome.hover ? 'missed' : outcome.visual ? 'visual' : 'heat';
  cell.classList.add('captured', kind);
  cell.innerHTML = kind === 'visual' ? '<i class="mini-window"></i><i class="mini-crack"></i>' : kind === 'heat' ? '<i class="heat-glow"></i>' : '<i class="sky-sliver"></i>';
}
function animateTest(now: number) {
  if (!running || phase !== 'test') return;
  const outcome = testOutcome(build);
  const elapsed = Math.min(TEST_MS, now - testStart);
  const progress = elapsed / TEST_MS;
  const effective = outcome.sustained ? progress : Math.min(progress, 0.58);
  const craft = document.querySelector<HTMLElement>('#test-craft');
  const beam = document.querySelector<HTMLElement>('#scan-beam');
  const caption = document.querySelector<HTMLElement>('#scene-caption');
  const bar = document.querySelector<HTMLElement>('#test-progress-bar');
  const stage = document.querySelector<HTMLElement>('#test-stage');
  if (!craft || !beam || !caption || !bar || !stage) return;
  const x = outcome.hover ? 29 + Math.sin(effective * Math.PI * 2) * 3 : 12 + effective * 80;
  const y = outcome.hover ? 25 + effective * 42 : 27 + Math.sin(effective * Math.PI) * 8;
  craft.style.left = `${x}%`; craft.style.top = `${y}%`;
  craft.style.transform = outcome.hover ? `translate(-50%,-50%) rotate(${Math.sin(progress * 25) * 2}deg)` : 'translate(-50%,-50%) rotate(10deg)';
  beam.style.left = `${x + (outcome.hover ? 6 : 0)}%`; beam.style.top = `${y + 8}%`;
  beam.style.opacity = progress > 0.13 && progress < (outcome.sustained ? 0.91 : 0.58) ? '1' : '0';
  bar.style.width = `${effective * 100}%`;
  if (!outcome.sustained && progress >= 0.58) {
    stage.classList.add('aborted');
    caption.textContent = t('test.powerLoss');
  } else if (progress < 0.13) caption.textContent = t('test.takingOff');
  else caption.textContent = outcome.hover ? t('test.hovering') : t('test.sweeping');
  const shouldCapture = Math.min(outcome.sustained ? 6 : 3, Math.floor(Math.max(0, effective - 0.14) / 0.12));
  while (captured < shouldCapture) {
    const cell = document.querySelector<HTMLElement>(`[data-cell="${captured}"]`);
    if (cell) captureCell(cell, outcome);
    captured++;
  }
  if (progress < 1) { frameId = requestAnimationFrame(animateTest); return; }
  if (testDone) return;
  testDone = true; running = false;
  build = recordTest(build); save();
  if (outcome.success) scorm.complete(100, true);
  const result = document.querySelector<HTMLElement>('#test-observation');
  if (result) result.innerHTML = `<strong>${tx(outcome.success ? 'test.success' : 'test.needsWork')}</strong><span>${tx(outcome.hover ? 'test.platformGood' : 'test.platformBad')}</span><span>${tx(outcome.visual ? 'test.sensorGood' : 'test.sensorBad')}</span><span>${tx(outcome.sustained ? 'test.batteryGood' : 'test.batteryBad')}</span>`;
  caption.textContent = t(outcome.success ? 'test.sceneSuccess' : 'test.sceneFailure');
  document.querySelector<HTMLElement>('.return-button')?.focus();
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const partButton = target.closest<HTMLButtonElement>('[data-part]');
  if (partButton && phase === 'bench') {
    const part = partButton.dataset.part as Part;
    held = held === part ? null : part; inspection = false; hint = t(held ? 'bench.pickHint' : 'bench.defaultHint'); render(); return;
  }
  const slot = target.closest<HTMLButtonElement>('[data-slot]');
  if (slot && phase === 'bench') {
    const kind = slot.dataset.slot;
    if (held && held.startsWith(`${kind}:`)) applyPart(held);
    else if (kind === 'battery') { inspection = true; hint = ''; render(); }
    else setHint(`bench.${kind}Hint`);
    return;
  }
  const button = target.closest<HTMLButtonElement>('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'return') { cancelAnimationFrame(frameId); running = false; phase = 'bench'; held = null; hint = t('bench.returned'); render(); return; }
  if (phase !== 'bench') return;
  if (action === 'rotate-left' || action === 'rotate-right') { build.angle += action === 'rotate-left' ? -30 : 30; save(); render(); }
  if (action === 'remove-sensor' && build.sensor) { build = removeSensor(build); hint = t('bench.unmounted'); save(); render(); }
  if (action === 'inspect-battery') { inspection = true; hint = ''; render(); }
  if (action === 'test') startTest();
});
app.addEventListener('dragstart', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-part]');
  if (!button) return;
  held = button.dataset.part as Part;
  event.dataTransfer?.setData('text/plain', held);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
});
app.addEventListener('dragover', (event) => {
  const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-slot]');
  if (slot && held?.startsWith(`${slot.dataset.slot}:`)) { event.preventDefault(); slot.classList.add('drag-over'); }
});
app.addEventListener('dragleave', (event) => (event.target as HTMLElement).closest<HTMLElement>('[data-slot]')?.classList.remove('drag-over'));
app.addEventListener('drop', (event) => {
  const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-slot]');
  const part = event.dataTransfer?.getData('text/plain') as Part;
  if (slot && part?.startsWith(`${slot.dataset.slot}:`)) { event.preventDefault(); applyPart(part); }
});
app.addEventListener('dragend', () => { held = null; document.querySelectorAll('.drag-over').forEach((item) => item.classList.remove('drag-over')); });
render();
