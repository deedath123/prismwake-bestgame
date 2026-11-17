// shades.js — the Murk. Three kinds of shade slip from the eastern portals and
// walk the dark toward the beacon. Light is what they fear: a shade caught in a
// beam burns, slows under frost facets, and dies paying embers; a shade that
// reaches the beacon spends itself to wound the light.

import { FIELD } from './field.js';
import { beamDps, beamHalfWidth, killEmber } from './state.js';
import { litByBeam } from './beams.js';
import { sfx } from './audio.js';

export const SHADE_KINDS = {
  shade: { hp: 30, sp: 34, r: 13, ember: 6, dmg: 5 },
  swift: { hp: 18, sp: 58, r: 10, ember: 4, dmg: 3 },
  brute: { hp: 120, sp: 22, r: 20, ember: 14, dmg: 12 },
};

export function spawnShade(st) {
  const plan = st.plan;
  const roll = st.rng();
  const kind = roll < plan.bruteShare ? 'brute' : (roll < plan.bruteShare + plan.swiftShare ? 'swift' : 'shade');
  const def = SHADE_KINDS[kind];
  const portal = FIELD.portals[Math.floor(st.rng() * FIELD.portals.length)];
  // In the play test the first shades come down the middle lane, straight
  // through the beacon's own beam line, so the drill is quick and certain.
  const mid = st.testMode && st.stats.burned === 0 && st.shades.length < 3;
  st.shades.push({
    kind, def,
    r: def.r,
    x: portal.x + 10,
    y: (mid ? FIELD.beacon.y : portal.y) + (st.rng() - 0.5) * 44,
    hp: def.hp * plan.hpMul,
    max: def.hp * plan.hpMul,
    phase: st.rng() * Math.PI * 2,
    lit: false,
    burnT: 0,
  });
}

function burst(st, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = st.rng() * Math.PI * 2, v = 26 + st.rng() * 70;
    st.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45 + st.rng() * 0.3, max: 0.75, color });
  }
}

export function updateShades(st, dt, segments) {
  const b = FIELD.beacon;
  const half = beamHalfWidth(st);
  const dps = beamDps(st);
  const alive = [];
  for (const s of st.shades) {
    s.lit = litByBeam(s.x, s.y, s.r, segments, half);
    if (s.lit) {
      s.hp -= dps * dt;
      s.burnT += dt;
      if (st.test) st.test.beamLit = true;
      if (s.burnT > 0.12) { s.burnT = 0; burst(st, s.x, s.y, 1, '#ffb454'); sfx.burn(); }
    }
    if (s.hp <= 0) {
      const gain = killEmber(st, s.def.ember);
      st.embers += gain;
      st.stats.embersEarned += gain;
      st.stats.burned += 1;
      if (st.test) st.test.burned = true;
      burst(st, s.x, s.y, 10, '#ffc46b');
      continue;
    }
    // Walk for the beacon, drifting on a slow sine so the line of dark wavers.
    const dx = b.x - s.x, dy = b.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(st.time * 1.6 + s.phase) * 0.38;
    const mx = dx / d - (dy / d) * wob, my = dy / d + (dx / d) * wob;
    const sp = s.def.sp * st.plan.spMul * (s.lit && st.upgrades.frost ? 0.65 : 1);
    s.x += mx * sp * dt;
    s.y += my * sp * dt;
    if (d < FIELD.beacon.baseR + s.r * 0.4) {
      st.beaconHp -= s.def.dmg;
      burst(st, b.x + 20, b.y, 12, '#ff6b5e');
      sfx.thud();
      continue;
    }
    alive.push(s);
  }
  st.shades = alive;
}

export function updateParticles(st, dt) {
  const keep = [];
  for (const p of st.particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    keep.push(p);
  }
  st.particles = keep;
}
