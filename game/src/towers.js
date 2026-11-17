// towers.js — the three tower kinds and what a standing tower is. A mirror is a
// line the beam reflects off; a prism is a point that splits the beam; a lantern
// is a small light of its own that the player aims. Towers stand on field plots.

import { FIELD } from './field.js';

export const TOWER_KINDS = {
  mirror: {
    name: 'Mirror', cost: 40, key: '1',
    desc: 'Bends the beam. Turn it live, mid-assault.',
    defaultAngle: Math.PI / 4,
  },
  prism: {
    name: 'Prism', cost: 90, key: '2',
    desc: 'Splits the beam in two where it strikes.',
    defaultAngle: 0,
  },
  lantern: {
    name: 'Lantern', cost: 130, key: '3',
    desc: 'A light of its own. Aim it with Q / E.',
    defaultAngle: 0,
  },
};

let nextId = 1;

export function makeTower(kind, plot) {
  const def = TOWER_KINDS[kind];
  return {
    id: nextId++,
    kind,
    def,
    plot,
    x: plot.x,
    y: plot.y,
    angle: def.defaultAngle,   // mirror: its line's angle; lantern: its facing
    spin: 0,                   // render-only shimmer phase
  };
}

export function towerAt(st, x, y) {
  // The standing tower nearest the point, within picking distance.
  let best = null, bestD = 30;
  for (const t of st.towers) {
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best;
}

export function plotAt(st, x, y) {
  // The free plot nearest the point, within picking distance, or null.
  let best = null, bestD = 34;
  for (const p of FIELD.plots) {
    if (st.towers.some((t) => t.plot === p)) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}
