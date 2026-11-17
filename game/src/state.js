// state.js — the whole game state and the ember shop's catalogue. Everything
// mutable lives in one object made by newGame(); the derived helpers translate
// upgrade levels into the numbers the beam, the shades and the shop all share.

import { FIELD, makeRng } from './field.js';
import { makeTower } from './towers.js';

// The twelve lines of the ember shop: three tower kinds are bought on the field
// from the build bar; these nine are the upgrades bought between nights.
export const UPGRADES = [
  { id: 'core',    name: 'Hotter Core',   max: 3, cost: (l) => 80 + 40 * l,  desc: '+10 burn a second, per level. The light bites harder.' },
  { id: 'lens',    name: 'Wider Lens',    max: 2, cost: (l) => 70 + 50 * l,  desc: '+6 beam width, per level. More of the night is lit at once.' },
  { id: 'longlight', name: 'Long Light',  max: 2, cost: (l) => 70 + 50 * l,  desc: '+450 beam reach, per level, before the light tires.' },
  { id: 'tall',    name: 'Tall Mirrors',  max: 1, cost: () => 60,            desc: 'Mirrors stand 14 longer — far easier for a beam to catch.' },
  { id: 'twin',    name: 'Twin Facets',   max: 1, cost: () => 150,           desc: 'A prism struck by light splits it three ways, not two.' },
  { id: 'frost',   name: 'Frost Facets',  max: 1, cost: () => 90,            desc: 'Murk caught in the light crawls at 65% speed.' },
  { id: 'charm',   name: 'Ember Charm',   max: 2, cost: (l) => 60 + 40 * l,  desc: '+25% embers from every burn, per level.' },
  { id: 'plating', name: 'Beacon Plating', max: 2, cost: (l) => 60 + 40 * l, desc: '+25 beacon heart, and mend 25 now, per level.' },
  { id: 'hands',   name: 'Swift Hands',   max: 1, cost: () => 50,            desc: 'Mirrors turn in fine 7.5° steps instead of 15°.' },
];

export function newGame(seed = 20261117) {
  const st = {
    phase: 'title',           // title | build | assault | shop | won | lost
    paused: false,
    time: 0,
    night: 1,
    embers: 120,
    beaconHp: 100,
    beaconMax: 100,
    towers: [],
    shades: [],
    particles: [],
    selectedKind: 'mirror',
    selectedTower: null,
    upgrades: { core: 0, lens: 0, longlight: 0, tall: 0, twin: 0, frost: 0, charm: 0, plating: 0, hands: 0 },
    stats: { burned: 0, embersEarned: 0, turned: 0, built: 0, nightsHeld: 0 },
    spawnLeft: 0,
    spawnT: 0,
    plan: null,
    msg: '',
    msgT: 0,
    rng: makeRng(seed),
    testMode: false,
    test: null,               // play-test flags, only in ?test=1
  };
  // The old watch's two mirrors stand ready — the beam already dances at title.
  const m1 = makeTower('mirror', FIELD.plots[1]); m1.angle = Math.PI / 4; st.towers.push(m1);
  const m2 = makeTower('mirror', FIELD.plots[6]); m2.angle = -Math.PI / 5; st.towers.push(m2);
  return st;
}

export function say(st, text, secs = 3.2) { st.msg = text; st.msgT = secs; }

// --- derived numbers, one definition shared by every system ---
export const beamDps = (st) => 26 + 10 * st.upgrades.core;
export const beamHalfWidth = (st) => 13 + 6 * st.upgrades.lens;
export const beamReach = (st) => 2500 + 450 * st.upgrades.longlight;
export const mirrorLen = (st) => 46 + (st.upgrades.tall ? 14 : 0);
export const rotateStep = (st) => (st.upgrades.hands ? Math.PI / 24 : Math.PI / 12);
export const killEmber = (st, base) => Math.round(base * (1 + 0.25 * st.upgrades.charm));
export const sellPrice = (tower) => Math.floor(tower.kind.cost * 0.6);

export function buyUpgrade(st, id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up) return false;
  const lvl = st.upgrades[id];
  if (lvl >= up.max) return false;
  const price = up.cost(lvl);
  if (st.embers < price) return false;
  st.embers -= price;
  st.upgrades[id] = lvl + 1;
  if (id === 'plating') { st.beaconMax += 25; st.beaconHp = Math.min(st.beaconMax, st.beaconHp + 25); }
  if (st.test) st.test.bought = true;
  return true;
}
