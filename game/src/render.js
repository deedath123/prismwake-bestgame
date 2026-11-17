// render.js — everything the canvas shows: the dusk field and its stone plots,
// the rocks and the dark portals, the beam drawn in three glowing layers, the
// towers, the beacon, and the Murk — dim silhouettes in the dark, rimmed with
// fire where the light catches them. The DOM carries the HUD and the panels;
// this file is the world itself.

import { PAL } from './palette.js';
import { FIELD } from './field.js';
import { beamHalfWidth, mirrorLen } from './state.js';

function starField(ctx) {
  // Fixed pseudo-random stars, drawn from a tiny LCG so every frame agrees.
  let a = 1234567;
  const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  ctx.fillStyle = PAL.star;
  for (let i = 0; i < 110; i++) {
    const x = rnd() * FIELD.w, y = rnd() * 210, r = rnd() * 1.3 + 0.3;
    ctx.globalAlpha = 0.25 + rnd() * 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// The still parts of the world — sky, stars, moon, dunes, rocks — never change
// between frames, so they are painted once onto an offscreen canvas and blitted;
// the vignette gets the same treatment. A frame then costs the moving things
// only: plots, portals, the beam, the towers and the Murk.
let staticLayer = null;
let vignetteLayer = null;

function buildLayers() {
  const { w, h } = FIELD;
  staticLayer = document.createElement('canvas');
  staticLayer.width = w; staticLayer.height = h;
  const c = staticLayer.getContext('2d');
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, PAL.skyTop); sky.addColorStop(0.42, PAL.skyMid);
  sky.addColorStop(0.62, PAL.skyLow); sky.addColorStop(0.64, PAL.groundTop);
  sky.addColorStop(1, PAL.groundLow);
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  starField(c);
  // A low moon in the west, behind the beacon.
  c.fillStyle = 'rgba(240,230,200,0.85)';
  c.beginPath(); c.arc(84, 92, 26, 0, 7); c.fill();
  c.fillStyle = 'rgba(200,190,230,0.25)';
  c.beginPath(); c.arc(76, 86, 6, 0, 7); c.arc(94, 100, 4, 0, 7); c.fill();
  // Dune silhouettes along the horizon.
  c.fillStyle = PAL.duneFar;
  c.beginPath(); c.moveTo(0, 470);
  for (let x = 0; x <= w; x += 80) c.lineTo(x, 452 + Math.sin(x * 0.011) * 16);
  c.lineTo(w, 720); c.lineTo(0, 720); c.fill();
  c.fillStyle = PAL.duneNear;
  c.beginPath(); c.moveTo(0, 540);
  for (let x = 0; x <= w; x += 80) c.lineTo(x, 528 + Math.cos(x * 0.009) * 13);
  c.lineTo(w, 720); c.lineTo(0, 720); c.fill();
  // Rocks swallow light.
  for (const r of FIELD.rocks) {
    c.fillStyle = PAL.rock;
    c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.fill();
    c.lineWidth = 2; c.strokeStyle = PAL.rockEdge; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.beginPath(); c.arc(r.x - r.r * 0.3, r.y - r.r * 0.35, r.r * 0.45, 0, 7); c.fill();
  }
  vignetteLayer = document.createElement('canvas');
  vignetteLayer.width = w; vignetteLayer.height = h;
  const v = vignetteLayer.getContext('2d');
  const g = v.createRadialGradient(640, 360, 380, 640, 360, 860);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
  v.fillStyle = g; v.fillRect(0, 0, w, h);
}

export function draw(ctx, st, segments) {
  const { w, h } = FIELD;
  if (!staticLayer) buildLayers();
  ctx.drawImage(staticLayer, 0, 0);

  // Stone plots; a free plot under the mouse glows.
  for (const p of FIELD.plots) {
    const taken = st.towers.some((t) => t.plot === p);
    ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, 7);
    ctx.fillStyle = PAL.plotFill; ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = (st.hoverPlot === p && !taken) ? PAL.plotHover : PAL.plotEdge;
    ctx.stroke();
    if (!taken) {
      ctx.fillStyle = 'rgba(220,210,255,0.5)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 7); ctx.fill();
    }
  }

  // Portals: slow dark swirls at the east edge.
  for (const p of FIELD.portals) {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 40);
    g.addColorStop(0, '#000'); g.addColorStop(0.7, PAL.portal); g.addColorStop(1, 'rgba(5,3,15,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, 7); ctx.fill();
    ctx.strokeStyle = PAL.portalRim; ctx.lineWidth = 1.4;
    ctx.beginPath();
    const off = st.time * 0.7 % (Math.PI * 2);
    ctx.arc(p.x, p.y, 26, off, off + Math.PI * 1.4); ctx.stroke();
  }

  drawBeams(ctx, st, segments);
  drawBeacon(ctx, st);
  for (const t of st.towers) drawTower(ctx, st, t);
  for (const s of st.shades) drawShade(ctx, st, s);

  // Particles (burn sparks, beacon wounds).
  for (const p of st.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Vignette, from its cached layer.
  ctx.drawImage(vignetteLayer, 0, 0);
}

function drawBeams(ctx, st, segments) {
  const half = beamHalfWidth(st);
  ctx.lineCap = 'round';
  for (const pass of [[half * 3.2, PAL.beamGlow], [half * 1.5, PAL.beamMid], [2.6, PAL.beamCore]]) {
    ctx.strokeStyle = pass[1]; ctx.lineWidth = pass[0];
    ctx.beginPath();
    for (const s of segments) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
    ctx.stroke();
  }
  // Bright knots where the light turns or splits.
  ctx.fillStyle = PAL.beamCore;
  for (const s of segments.slice(1)) {
    ctx.beginPath(); ctx.arc(s.x1, s.y1, 3.2, 0, 7); ctx.fill();
  }
}

function drawBeacon(ctx, st) {
  const b = FIELD.beacon;
  const hurt = st.beaconHp / st.beaconMax;
  ctx.fillStyle = PAL.beaconStone;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.baseR, 0, 7); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = PAL.stoneEdge; ctx.stroke();
  const pulse = 1 + Math.sin(st.time * 2.4) * 0.08;
  const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 46 * pulse);
  g.addColorStop(0, 'rgba(255,220,140,0.95)');
  g.addColorStop(0.35, `rgba(255,180,84,${0.35 + 0.3 * hurt})`);
  g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(b.x, b.y, 46 * pulse, 0, 7); ctx.fill();
  ctx.fillStyle = PAL.beaconCrystal;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(Math.PI / 4 + st.time * 0.35);
  const r = b.r * 0.62;
  ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.42, r * 1.42);
  ctx.restore();
}

function drawTower(ctx, st, t) {
  const sel = st.selectedTower === t;
  if (sel) {
    ctx.strokeStyle = 'rgba(255,196,107,0.85)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(t.x, t.y, 30, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = PAL.mirrorPost;
  ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, 7); ctx.fill();
  ctx.strokeStyle = PAL.stoneEdge; ctx.lineWidth = 1.4; ctx.stroke();
  if (t.kind === 'mirror') {
    const L = mirrorLen(st) / 2;
    const ux = Math.cos(t.angle), uy = Math.sin(t.angle);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,233,184,0.28)'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(t.x - ux * L, t.y - uy * L); ctx.lineTo(t.x + ux * L, t.y + uy * L); ctx.stroke();
    ctx.strokeStyle = PAL.mirrorFace; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(t.x - ux * L, t.y - uy * L); ctx.lineTo(t.x + ux * L, t.y + uy * L); ctx.stroke();
  } else if (t.kind === 'prism') {
    ctx.fillStyle = PAL.prism;
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(st.time * 0.5);
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(13, 10); ctx.lineTo(-13, 10); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(168,236,255,0.25)';
    ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, 7); ctx.fill();
  } else if (t.kind === 'lantern') {
    const fx = Math.cos(t.angle), fy = Math.sin(t.angle);
    ctx.strokeStyle = PAL.mirrorPost; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + fx * 15, t.y + fy * 15); ctx.stroke();
    const g = ctx.createRadialGradient(t.x + fx * 17, t.y + fy * 17, 1, t.x + fx * 17, t.y + fy * 17, 24);
    g.addColorStop(0, 'rgba(255,233,176,0.95)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(t.x + fx * 17, t.y + fy * 17, 24, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.lanternCore;
    ctx.beginPath(); ctx.arc(t.x + fx * 17, t.y + fy * 17, 5, 0, 7); ctx.fill();
  }
}

function drawShade(ctx, st, s) {
  const body = s.kind === 'brute' ? PAL.bruteBody : (s.kind === 'swift' ? PAL.swiftBody : PAL.shadeBody);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, s.r, s.r * 1.12, 0, 0, 7);
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = s.lit ? PAL.shadeLit : PAL.shadeRim;
  ctx.stroke();
  // Two pale eyes, fixed on the beacon.
  ctx.fillStyle = s.lit ? '#fff2cf' : PAL.shadeEye;
  ctx.beginPath();
  ctx.arc(s.x - s.r * 0.34, s.y - s.r * 0.12, 1.9, 0, 7);
  ctx.arc(s.x + s.r * 0.3, s.y - s.r * 0.18, 1.9, 0, 7);
  ctx.fill();
  if (s.hp < s.max) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(s.x - s.r, s.y - s.r - 10, s.r * 2, 3.6);
    ctx.fillStyle = s.lit ? PAL.shadeLit : '#8f7fd4';
    ctx.fillRect(s.x - s.r, s.y - s.r - 10, s.r * 2 * Math.max(0, s.hp / s.max), 3.6);
  }
}
