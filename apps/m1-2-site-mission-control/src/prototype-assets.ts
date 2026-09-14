import * as THREE from 'three';
// Extracted from the preserved prototype; procedural window and helipad textures.
export function createWindowTexture(litProbability: number = 0.5): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111827'; // Dark building color
  ctx.fillRect(0, 0, 128, 128);

  // Draw 2x2 window grid
  const margin = 12;
  const w = 44;
  const h = 44;
  const positions = [
    { x: margin, y: margin },
    { x: margin + w + 16, y: margin },
    { x: margin, y: margin + h + 16 },
    { x: margin + w + 16, y: margin + h + 16 }
  ];

  positions.forEach(pos => {
    const isLit = Math.random() < litProbability;
    ctx.fillStyle = isLit ? '#fbbf24' : '#1f2937'; // Golden yellow or deep grey/blue
    ctx.fillRect(pos.x, pos.y, w, h);
    if (isLit) {
      // Inner glass shadow / glow
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(pos.x + 4, pos.y + 4, w - 8, h - 8);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createHelipadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background concrete
  ctx.fillStyle = '#374151';
  ctx.fillRect(0, 0, 256, 256);

  // Outer yellow border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.stroke();

  // Circle fill indicator
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Letter "H"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 96px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

