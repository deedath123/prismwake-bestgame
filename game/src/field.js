// field.js — the playfield's fixed geography: the beacon on its stone at the
// west edge, fourteen stone plots a tower can stand on, four rocks that swallow
// light, and the three dark portals the Murk pours from in the east.

export const FIELD = {
  w: 1280,
  h: 720,
  beacon: { x: 148, y: 360, r: 20, baseR: 36 },
  plots: [
    { x: 330, y: 168 }, { x: 330, y: 360 }, { x: 330, y: 552 },
    { x: 472, y: 258 }, { x: 472, y: 452 },
    { x: 612, y: 152 }, { x: 612, y: 360 }, { x: 612, y: 568 },
    { x: 752, y: 252 }, { x: 752, y: 462 },
    { x: 892, y: 158 }, { x: 892, y: 384 }, { x: 892, y: 566 },
    { x: 1032, y: 300 }, { x: 1032, y: 486 },
  ],
  rocks: [
    { x: 700, y: 84, r: 30 },
    { x: 700, y: 648, r: 34 },
    { x: 1120, y: 120, r: 28 },
    { x: 1150, y: 612, r: 30 },
  ],
  portals: [
    { x: 1252, y: 148 },
    { x: 1252, y: 360 },
    { x: 1252, y: 572 },
  ],
};

// A small seeded RNG (mulberry32) so a night always plays the same way twice —
// the screenshots and the play test are deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
