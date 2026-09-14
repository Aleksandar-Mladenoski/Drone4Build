import type { Capture, GameState, ViewMode } from './rules.ts';

export const WORLD = { width: 1700, height: 900 };

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
}
function path(c: CanvasRenderingContext2D, points: [number, number][], fill: string): void {
  c.beginPath(); c.moveTo(...points[0]); for (const p of points.slice(1)) c.lineTo(...p); c.closePath(); c.fillStyle = fill; c.fill();
}
function line(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1): void {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = stroke; c.lineWidth = width; c.stroke();
}
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
}
function gradient(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stops: [number, string][]): CanvasGradient {
  const g = c.createLinearGradient(x, y, x + w, y + h); stops.forEach(([at, colour]) => g.addColorStop(at, colour)); return g;
}
function noise(x: number, y: number): number { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); }

function drawWindow(c: CanvasRenderingContext2D, x: number, y: number, mode: 'rgb' | 'thermal', station: number, reflective: boolean): void {
  const frame = mode === 'rgb' ? '#d8d7cf' : '#372f61';
  const glass = mode === 'rgb'
    ? gradient(c, x, y, 170, 127, [[0, '#354b55'], [.42, '#7695a1'], [1, '#223e4a']])
    : gradient(c, x, y, 170, 127, [[0, '#222d61'], [.5, '#48416f'], [1, '#1c2e59']]);
  rect(c, x - 9, y - 9, 188, 145, frame);
  rect(c, x, y, 170, 127, glass as unknown as string);
  c.save(); c.beginPath(); c.rect(x + 2, y + 2, 166, 123); c.clip();
  if (mode === 'rgb') {
    path(c, [[x + 12 + station * 7, y + 77], [x + 92 + station * 7, y + 2], [x + 133 + station * 7, y + 2], [x + 43 + station * 7, y + 125]], '#bad2d29c');
    line(c, x + 4, y + 116, x + 166, y + 37, '#d8e2d655', 5);
  } else {
    path(c, [[x + 10, y + 88], [x + 85, y + 6], [x + 132, y + 6], [x + 45, y + 125]], '#6d668084');
  }
  if (reflective) {
    const shift = station * 113;
    const opacity = station === 0 ? .96 : station === -1 ? .38 : .1;
    c.globalAlpha = opacity;
    if (mode === 'thermal') {
      const glow = c.createRadialGradient(x + 88 + shift, y + 54, 6, x + 88 + shift, y + 54, 65);
      glow.addColorStop(0, '#ffe39b'); glow.addColorStop(.28, '#f5a052'); glow.addColorStop(.65, '#ae6091'); glow.addColorStop(1, '#5e467700');
      rect(c, x, y, 170, 127, glow as unknown as string);
      path(c, [[x + 74 + shift, y + 5], [x + 126 + shift, y + 5], [x + 51 + shift, y + 125], [x + 8 + shift, y + 125]], '#ffd27a8c');
    } else {
      path(c, [[x + 72 + shift, y + 6], [x + 120 + shift, y + 6], [x + 49 + shift, y + 124], [x + 6 + shift, y + 124]], '#f0eee1b8');
    }
    c.globalAlpha = 1;
  }
  c.restore();
  rect(c, x + 81, y, 8, 127, frame); rect(c, x, y + 60, 170, 7, frame);
  rect(c, x - 14, y + 131, 198, 10, mode === 'rgb' ? '#989f9d' : '#584e75');
}

export function drawWorld(c: CanvasRenderingContext2D, mode: 'rgb' | 'thermal', station: -1 | 0 | 1): void {
  const thermal = mode === 'thermal';
  rect(c, 0, 0, WORLD.width, WORLD.height,
    gradient(c, 0, 0, 0, 900, thermal ? [[0, '#182b51'], [1, '#43516b']] : [[0, '#9fc5d4'], [.7, '#d6dde0'], [1, '#c9c5ae']]) as unknown as string);
  // Distant city and site equipment give the facade a readable location and scale.
  for (let i = 0; i < 12; i++) {
    const x = i * 155 - 40 + station * (i % 2 ? 14 : -14);
    const h = 72 + (i * 37) % 110;
    rect(c, x, 625 - h, 112, h, thermal ? '#343e63' : '#aeb6b5');
    for (let j = 0; j < 4; j++) rect(c, x + 12 + j * 23, 625 - h + 20, 11, 22, thermal ? '#28375e' : '#819ca7');
  }
  rect(c, 0, 798, 1700, 102, thermal ? '#2e365c' : '#8a8d83');
  path(c, [[100, 798], [1460, 798], [1535, 875], [50, 875]], thermal ? '#5a5471' : '#aab0a9');
  path(c, [[1490, 130], [1640, 175], [1640, 790], [1490, 800]], thermal ? '#434062' : '#8d9898');
  for (let i = 0; i < 10; i++) line(c, 1500, 185 + i * 62, 1640, 227 + i * 60, thermal ? '#4d4564' : '#687f86', 2);
  // Facade wall, masonry grain, bay rhythm and structural seams are shared by both instruments.
  rect(c, 115, 124, 1380, 673,
    gradient(c, 115, 124, 1380, 673, thermal
      ? [[0, '#655872'], [.26, '#635775'], [.57, '#625271'], [.84, '#7a6175'], [1, '#bc7671']]
      : [[0, '#d3d0c4'], [.45, '#c1c7c1'], [.8, '#c7c3b2'], [1, '#e7d1aa']]) as unknown as string);
  // Solar-exposed return appears as a broad condition, with a corresponding RGB light boundary.
  rect(c, 1335, 124, 160, 673, gradient(c, 1335, 124, 160, 0,
    thermal ? [[0, '#87657870'], [.5, '#d8856bd6'], [1, '#edaa72']]
      : [[0, '#e0d1ae22'], [1, '#f2d59a']]) as unknown as string);
  for (let row = 0; row < 27; row++) {
    const y = 145 + row * 24;
    line(c, 115, y, 1495, y, thermal ? '#483f6490' : '#969e98a3', 1.6);
    for (let col = 0; col < 23; col++) {
      const x = 115 + col * 60 + (row % 2 ? 30 : 0);
      line(c, x, y, x, y + 23, thermal ? '#55486880' : '#a1a8a0a3', 1);
      if (noise(row, col) > .76) rect(c, x + 9, y + 6, 19, 5, thermal ? '#78617a33' : '#f6ecdc75');
    }
  }
  for (const x of [210, 435, 660, 885, 1110, 1335]) {
    rect(c, x - 17, 125, 17, 672, thermal ? '#4d476a' : '#afb3aa');
    line(c, x, 128, x, 795, thermal ? '#92717d75' : '#eff1df99', 3);
  }
  // A repeated vertical pattern stays in the same masonry seam at every viewpoint.
  if (thermal) {
    const band = c.createLinearGradient(792, 0, 930, 0);
    band.addColorStop(0, '#b86f7850'); band.addColorStop(.28, '#e89262bf'); band.addColorStop(.57, '#f9c47ed9'); band.addColorStop(.83, '#d7866ca8'); band.addColorStop(1, '#a66b7840');
    rect(c, 792, 180, 138, 570, band as unknown as string);
    for (let i = 0; i < 18; i++) ellipse(c, 827 + noise(i, 7) * 78, 205 + i * 28, 5 + noise(i, 2) * 13, 8, '#f7b57535');
  }
  for (const y of [221, 377, 533]) {
    for (const x of [253, 478, 703, 928, 1153]) {
      drawWindow(c, x, y, mode, station, x === 1153 && y === 377);
    }
  }
  // Lower-wall patch has RGB discoloration but remains only a possible indication.
  c.save(); c.globalAlpha = thermal ? .55 : .3;
  for (let i = 0; i < 22; i++) {
    const x = 358 + noise(i, 12) * 330, y = 715 + noise(i, 24) * 88;
    ellipse(c, x, y, 35 + noise(i, 39) * 46, 17 + noise(i, 91) * 18,
      thermal ? '#343c72' : '#64716d');
  }
  c.restore();
  // Roof, downpipes, parapet, scaffold and ground details.
  rect(c, 101, 106, 1415, 26, thermal ? '#d18b70' : '#777e7a');
  rect(c, 103, 99, 1412, 9, thermal ? '#edab76' : '#d5d2c7');
  for (const x of [385, 1394]) { rect(c, x, 133, 10, 657, thermal ? '#51425f' : '#768990'); rect(c, x - 4, 755, 18, 6, thermal ? '#564563' : '#8c9a9b'); }
  rect(c, 105, 786, 1400, 20, thermal ? '#383a60' : '#757c75');
  for (const x of [73, 1517]) {
    line(c, x, 182, x, 806, thermal ? '#a8737d' : '#b78d5e', 7);
    line(c, x + 56, 182, x + 56, 806, thermal ? '#a8737d' : '#b78d5e', 7);
    for (let y = 227; y <= 804; y += 144) { line(c, x, y, x + 56, y, thermal ? '#a8737d' : '#b78d5e', 6); line(c, x, y, x + 56, y + 144, thermal ? '#71516c' : '#9f7752', 3); }
  }
  for (let i = 0; i < 11; i++) {
    const x = 170 + i * 121;
    rect(c, x, 836, 62, 18, thermal ? '#6c526a' : '#a87b52');
    line(c, x + 10, 836, x + 32, 808, thermal ? '#8a6070' : '#80684f', 4);
  }
  // Thermal palette is qualitative. Sparse mottling suggests material response, not measurements.
  if (thermal) {
    c.globalAlpha = .08;
    for (let i = 0; i < 650; i++) {
      const x = 115 + noise(i, 41) * 1380, y = 134 + noise(i, 93) * 645;
      rect(c, x, y, 3 + noise(i, 74) * 6, 2, i % 3 ? '#ffd38c' : '#182d60');
    }
    c.globalAlpha = 1;
  }
}

function cameraScale(width: number, height: number, zoom: number): number { return Math.min(width / 1550, height / 830) * zoom; }

export function screenToWorld(state: GameState, width: number, height: number, sx: number, sy: number): { x: number; y: number } {
  const scale = cameraScale(width, height, state.zoom);
  return { x: state.camera.x + (sx - width / 2) / scale, y: state.camera.y + (sy - height / 2) / scale };
}

export function constrainCamera(state: GameState): void {
  state.camera.x = Math.max(100, Math.min(1600, state.camera.x));
  state.camera.y = Math.max(100, Math.min(800, state.camera.y));
  state.reticle.x = Math.max(0, Math.min(WORLD.width, state.reticle.x));
  state.reticle.y = Math.max(0, Math.min(WORLD.height, state.reticle.y));
}

export function drawViewport(canvas: HTMLCanvasElement, state: GameState): void {
  const box = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, box.width), height = Math.max(1, box.height);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const c = canvas.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  rect(c, 0, 0, width, height, '#12202c');
  const drawMode = (mode: 'rgb' | 'thermal') => {
    c.save(); c.translate(width / 2, height / 2); c.scale(cameraScale(width, height, state.zoom), cameraScale(width, height, state.zoom));
    c.translate(-state.camera.x, -state.camera.y); drawWorld(c, mode, state.viewpoint); c.restore();
  };
  if (state.mode === 'split') {
    c.save(); c.beginPath(); c.rect(0, 0, width / 2, height); c.clip(); drawMode('rgb'); c.restore();
    c.save(); c.beginPath(); c.rect(width / 2, 0, width / 2, height); c.clip(); drawMode('thermal'); c.restore();
    line(c, width / 2, 0, width / 2, height, '#f7e8ae', 3);
  } else drawMode(state.mode);
  for (const item of state.captures) {
    const x = width / 2 + (item.x - state.camera.x) * cameraScale(width, height, state.zoom);
    const y = height / 2 + (item.y - state.camera.y) * cameraScale(width, height, state.zoom);
    ellipse(c, x, y, 13, 13, item.decision === 'retain' ? '#74e2b3' : item.decision === 'reject' ? '#df8190' : '#f2ca73');
    c.fillStyle = '#0a2030'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(item.id), x, y);
  }
  const rx = width / 2 + (state.reticle.x - state.camera.x) * cameraScale(width, height, state.zoom);
  const ry = height / 2 + (state.reticle.y - state.camera.y) * cameraScale(width, height, state.zoom);
  c.strokeStyle = '#ffedba'; c.lineWidth = 2; c.beginPath(); c.arc(rx, ry, 19, 0, Math.PI * 2); c.stroke();
  for (const [dx, dy] of [[-34, 0], [34, 0], [0, -34], [0, 34]]) line(c, rx + dx * .55, ry + dy * .55, rx + dx, ry + dy, '#ffedba', 2);
}

export function drawCapture(canvas: HTMLCanvasElement, item: Capture, mode: 'rgb' | 'thermal'): void {
  canvas.width = 240; canvas.height = 150;
  const c = canvas.getContext('2d')!;
  rect(c, 0, 0, 240, 150, '#1b2f3d');
  c.save(); c.translate(120, 75); c.scale(.54, .54); c.translate(-item.x, -item.y); drawWorld(c, mode, item.viewpoint); c.restore();
  c.strokeStyle = '#f6ddaa'; c.lineWidth = 2; c.beginPath(); c.arc(120, 75, 14, 0, Math.PI * 2); c.stroke();
}
