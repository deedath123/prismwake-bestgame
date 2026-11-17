// beams.js — the light itself. A beam leaves the beacon (and each lantern),
// flies straight until it strikes something, reflects off mirror lines, splits
// at prisms, and dies on rock or at the field's edge. Tracing runs every frame
// from the towers' current angles, which is what makes steering live: turn a
// mirror mid-assault and the whole lit path swings with it this instant.

import { FIELD } from './field.js';
import { beamReach, mirrorLen } from './state.js';

const SPLIT_ANGLE = 28 * Math.PI / 180;
const PRISM_R = 16;

function raySeg(ox, oy, dx, dy, x1, y1, x2, y2) {
  // Distance along the ray to the segment, or Infinity.
  const ex = x2 - x1, ey = y2 - y1;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return Infinity;
  const t = ((x1 - ox) * ey - (y1 - oy) * ex) / den;
  const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
  return (t >= 0 && u >= 0 && u <= 1) ? t : Infinity;
}

function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const lx = cx - ox, ly = cy - oy;
  const tca = lx * dx + ly * dy;
  if (tca < 0) return Infinity;
  const d2 = lx * lx + ly * ly - tca * tca;
  if (d2 > r * r) return Infinity;
  return tca - Math.sqrt(r * r - d2);
}

function rayBounds(ox, oy, dx, dy) {
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (FIELD.w - 10 - ox) / dx);
  if (dx < -1e-9) t = Math.min(t, (10 - ox) / dx);
  if (dy > 1e-9) t = Math.min(t, (FIELD.h - 10 - oy) / dy);
  if (dy < -1e-9) t = Math.min(t, (10 - oy) / dy);
  return t;
}

function traceOne(st, ox, oy, angle, budget, segments, depth) {
  if (depth > 12 || segments.length > 46 || budget <= 4) return;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let bestT = Math.min(budget, rayBounds(ox, oy, dx, dy));
  let hit = null;

  for (const t of st.towers) {
    if (t.kind === 'mirror') {
      const L = mirrorLen(st) / 2;
      const ux = Math.cos(t.angle), uy = Math.sin(t.angle);
      const d = raySeg(ox, oy, dx, dy, t.x - ux * L, t.y - uy * L, t.x + ux * L, t.y + uy * L);
      if (d > 2 && d < bestT) { bestT = d; hit = { kind: 'mirror', tower: t }; }
    } else if (t.kind === 'prism') {
      const d = rayCircle(ox, oy, dx, dy, t.x, t.y, PRISM_R);
      if (d > 2 && d < bestT) { bestT = d; hit = { kind: 'prism', tower: t }; }
    }
  }
  for (const r of FIELD.rocks) {
    const d = rayCircle(ox, oy, dx, dy, r.x, r.y, r.r);
    if (d > 0 && d < bestT) { bestT = d; hit = { kind: 'rock' }; }
  }

  const hx = ox + dx * bestT, hy = oy + dy * bestT;
  segments.push({ x1: ox, y1: oy, x2: hx, y2: hy });
  if (!hit) return;

  if (hit.kind === 'mirror') {
    const ux = Math.cos(hit.tower.angle), uy = Math.sin(hit.tower.angle);
    const dot = dx * ux + dy * uy;
    const rx = 2 * dot * ux - dx, ry = 2 * dot * uy - dy;
    traceOne(st, hx + rx * 2.5, hy + ry * 2.5, Math.atan2(ry, rx), budget - bestT, segments, depth + 1);
  } else if (hit.kind === 'prism') {
    const child = (budget - bestT) * 0.62;
    const offs = st.upgrades.twin ? [-SPLIT_ANGLE, 0, SPLIT_ANGLE] : [-SPLIT_ANGLE, SPLIT_ANGLE];
    for (const off of offs) {
      const a = angle + off;
      traceOne(st, hx + Math.cos(a) * (PRISM_R + 2), hy + Math.sin(a) * (PRISM_R + 2), a, child, segments, depth + 1);
    }
  }
}

// Every lit segment on the field this frame: the beacon's beam, then each
// lantern's own shorter beam in the direction it faces.
export function traceBeams(st) {
  const segments = [];
  const b = FIELD.beacon;
  traceOne(st, b.x + 14, b.y, 0, beamReach(st), segments, 0);
  for (const t of st.towers) {
    if (t.kind === 'lantern') {
      traceOne(st, t.x + Math.cos(t.angle) * 16, t.y + Math.sin(t.angle) * 16, t.angle, 720, segments, 0);
    }
  }
  return segments;
}

export function distToSeg(px, py, s) {
  const ex = s.x2 - s.x1, ey = s.y2 - s.y1;
  const len2 = ex * ex + ey * ey;
  let t = len2 ? ((px - s.x1) * ex + (py - s.y1) * ey) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = s.x1 + ex * t, cy = s.y1 + ey * t;
  return Math.hypot(px - cx, py - cy);
}

export function litByBeam(x, y, r, segments, halfWidth) {
  for (const s of segments) {
    if (distToSeg(x, y, s) < halfWidth + r) return true;
  }
  return false;
}
