import '../../../packages/core/src/ui.css';
import './style.css';
import { createScorm } from '../../../packages/core/src/scorm.ts';
import { createTranslator } from '../../../packages/core/src/locale.ts';
import en from '../locales/en.json';
import { attach, detach, newBuild, recordTest, restoreBuild, testOutcome, type Build, type ComponentId, type MountType } from './rules.ts';
import { WorkshopScene } from './WorkshopScene.ts';
import { TestScene } from './TestScene.ts';

const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const { t, locale } = createTranslator(en, dictionaries);
const scorm = createScorm('m1-1-mission-loadout');
const app = document.querySelector<HTMLDivElement>('#app')!;
document.documentElement.lang = locale;
document.title = `Drone4Build · ${t('title')}`;

let build: Build = restoreBuild(scorm.load<unknown>()) ?? newBuild();
let workshop: WorkshopScene | null = null;
let testScene: TestScene | null = null;
let messageKey = 'scene.default';
const esc = (value: string | number) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const tx = (key: string, values?: Record<string, string | number>) => esc(t(key, values));
const save = () => scorm.save(build);
const componentName = (component: ComponentId) => t(`component.${component}`);

function header() {
  return `<header class="hangar-header"><div class="hangar-brand"><span class="brand-mark">D<span>4</span>B</span><div><div class="eyebrow">${tx('course')}</div><strong>${tx('title')} <i>${tx('subtitle')}</i></strong></div></div><div class="header-state"><span class="live-dot"></span>${tx(scorm.snapshot().mode === 'mock' ? 'status.mock' : 'status.lms')}<small>${tx('status.tests', { count: build.tests })}</small></div></header>`;
}
function stateReadout() {
  const payload = build.payload ? t(`component.${build.payload}`) : t('state.empty');
  const battery = build.battery ? t(`component.battery-${build.battery}`) : t('state.empty');
  return `<div class="machine-state"><div><span>${tx('state.airframe')}</span><strong>${tx('state.multirotor')}</strong></div><div><span>${tx('state.payload')}</span><strong id="payload-state">${esc(payload)}</strong></div><div><span>${tx('state.power')}</span><strong id="battery-state" class="${build.battery === 'low' ? 'fault' : ''}">${esc(battery)}</strong></div></div>`;
}
function workshopView() {
  return `<main class="hangar-layout"><section class="scene-panel"><canvas id="workshop-canvas" aria-label="${tx('scene.aria')}"></canvas><div class="scene-title"><span class="eyebrow">${tx('scene.label')}</span><strong>${tx('scene.title')}</strong></div><div class="camera-tools"><button data-action="camera-reset">${tx('camera.reset')}</button><button data-action="focus-payload">${tx('camera.payload')}</button><button data-action="focus-battery">${tx('camera.battery')}</button></div><div class="interaction-strip"><span class="mouse-icon">↖</span><div><strong>${tx('controls.primary')}</strong><small>${tx('controls.secondary')}</small></div></div></section>
  <aside class="workshop-sidebar"><section class="mission-screen"><div class="screen-header"><span>WORK ORDER 01</span><i></i></div><div class="eyebrow">${tx('mission.label')}</div><h1>${tx('mission.title')}</h1><p>${tx('mission.brief')}</p><div class="mission-spec"><span>${tx('mission.behaviour')}</span><strong>${tx('mission.behaviourValue')}</strong><span>${tx('mission.information')}</span><strong>${tx('mission.informationValue')}</strong></div><div class="target-sketch" aria-hidden="true"><span></span><i></i><b></b></div></section>
  <section class="status-console"><div class="console-top"><div><div class="eyebrow">${tx('console.label')}</div><h2>${tx('console.title')}</h2></div><span class="console-light"></span></div>${stateReadout()}<div class="console-message" id="console-message" role="status">${tx(messageKey)}</div><button class="test-trigger" data-action="test" ${build.payload && build.battery ? '' : 'disabled'}><span>▶</span><div><strong>${tx('test.launch')}</strong><small>${tx('test.launchHint')}</small></div></button><div class="bench-actions"><button data-action="reset-build">${tx('workshop.reset')}</button><span>${tx('status.swaps', { count: build.swaps })}</span></div></section></aside></main>`;
}
function testView() {
  const outcome = testOutcome(build);
  return `<main class="test-layout-3d"><section class="test-viewport"><canvas id="test-canvas" aria-label="${tx('test.aria')}"></canvas><div class="test-hud top"><div><span>${tx('test.run', { count: build.tests + 1 })}</span><strong id="test-stage">${tx('test.takingOff')}</strong></div><div class="test-progress"><i id="test-progress"></i></div></div><div class="test-hud bottom"><span>${tx('test.auto')}</span><span id="capture-count">0 / 6 ${tx('test.captures')}</span></div></section><aside class="test-console"><div class="eyebrow">${tx('test.label')}</div><h1>${tx('test.title')}</h1><p>${tx('test.subtitle')}</p><div class="capture-grid-3d" id="capture-grid">${Array.from({length: 6}, (_, i) => `<div data-cell="${i}"><span>${i + 1}</span></div>`).join('')}</div><div class="test-result" id="test-result"><strong>${tx('test.observing')}</strong><p>${tx('test.watch')}</p></div><button class="return-button" data-action="return" disabled>${tx('test.return')}</button><button class="replay-button" data-action="reset-build">${tx('test.replay')}</button></aside></main>`;
}
function disposeScenes() { workshop?.dispose(); workshop = null; testScene?.dispose(); testScene = null; }
function updateReadout() {
  const payload = document.querySelector('#payload-state');
  const battery = document.querySelector('#battery-state');
  if (payload) payload.textContent = build.payload ? t(`component.${build.payload}`) : t('state.empty');
  if (battery) { battery.textContent = build.battery ? t(`component.battery-${build.battery}`) : t('state.empty'); battery.classList.toggle('fault', build.battery === 'low'); }
  const launch = document.querySelector<HTMLButtonElement>('[data-action="test"]'); if (launch) launch.disabled = !build.payload || !build.battery;
  const swaps = document.querySelector('.bench-actions span'); if (swaps) swaps.textContent = t('status.swaps', { count: build.swaps });
}
function showMessage(key: string, values?: Record<string, string | number>) {
  messageKey = key; const node = document.querySelector('#console-message'); if (node) node.textContent = t(key, values);
}
function startWorkshop() {
  disposeScenes(); app.innerHTML = `<div class="hangar-shell">${header()}${workshopView()}</div>`;
  const canvas = document.querySelector<HTMLCanvasElement>('#workshop-canvas')!;
  workshop = new WorkshopScene(canvas, build, {
    onAttach(component) {
      build = attach(build, component); save(); updateReadout();
      showMessage('scene.attached', { component: componentName(component) });
    },
    onDetach(mount) {
      build = detach(build, mount); save(); updateReadout();
      showMessage('scene.detached', { mount: t(`mount.${mount}`) });
    },
    onInspect(component) {
      showMessage(component === 'battery-low' ? 'inspect.low' : component === 'battery-charged' ? 'inspect.charged' : component === 'rgb' ? 'inspect.rgb' : 'inspect.thermal');
    },
    onMessage(message) {
      if (message === 'pickup') showMessage('scene.pickup');
      else if (message === 'rejected') showMessage('scene.rejected');
      else if (message === 'placed') showMessage('scene.placed');
    },
  });
}
function startTest() {
  if (!build.payload || !build.battery) { showMessage('scene.incomplete'); return; }
  disposeScenes(); app.innerHTML = `<div class="hangar-shell">${header()}${testView()}</div>`;
  const outcome = testOutcome(build);
  testScene = new TestScene(document.querySelector<HTMLCanvasElement>('#test-canvas')!, outcome, {
    onProgress(progress, captures, stage) {
      const bar = document.querySelector<HTMLElement>('#test-progress'); if (bar) bar.style.width = `${progress * 100}%`;
      const label = document.querySelector('#test-stage'); if (label) label.textContent = t(stage === 'launch' ? 'test.takingOff' : stage === 'inspect' ? (outcome.visual ? 'test.rgbActive' : 'test.thermalActive') : stage === 'abort' ? 'test.powerLoss' : 'test.completeStage');
      const count = document.querySelector('#capture-count'); if (count) count.textContent = `${captures} / 6 ${t('test.captures')}`;
      document.querySelectorAll<HTMLElement>('[data-cell]').forEach((cell, index) => {
        if (index < captures) cell.className = outcome.visual ? 'rgb-capture' : 'thermal-capture';
      });
    },
    onComplete() {
      build = recordTest(build); save();
      if (outcome.success) scorm.complete(100, true);
      const result = document.querySelector<HTMLElement>('#test-result');
      if (result) {
        result.className = `test-result ${outcome.success ? 'success' : 'failure'}`;
        result.innerHTML = `<strong>${tx(outcome.success ? 'test.success' : 'test.needsWork')}</strong><p>${tx(!outcome.sustained ? 'test.batteryBad' : !outcome.visual ? 'test.sensorBad' : 'test.successBody')}</p>`;
      }
      const button = document.querySelector<HTMLButtonElement>('[data-action="return"]'); if (button) { button.disabled = false; button.focus(); }
      const replay = document.querySelector<HTMLElement>('.replay-button'); if (replay && outcome.success) replay.style.display = 'block';
    },
  });
}
function resetBuild() { build = newBuild(); save(); messageKey = 'scene.reset'; startWorkshop(); }

app.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'camera-reset') workshop?.resetCamera();
  else if (action === 'focus-payload') workshop?.focus('payload');
  else if (action === 'focus-battery') workshop?.focus('battery');
  else if (action === 'test') startTest();
  else if (action === 'return') { messageKey = build.lastTest?.success ? 'scene.successReturn' : 'scene.failureReturn'; startWorkshop(); }
  else if (action === 'reset-build') resetBuild();
});
window.addEventListener('beforeunload', disposeScenes);
startWorkshop();
