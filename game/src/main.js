// main.js — the boot and the one game loop. It wires the DOM (HUD, build bar,
// title, shop and results overlays) to the state, runs the phases — title,
// build, assault, shop, won, lost — and owns the player's hands: building on
// plots, selling, and steering standing mirrors and lanterns live while a
// night is running. It also carries the deterministic ?shot= scenes the
// screenshots are taken from and the ?test=1 drill the play test drives.

import { FIELD } from './field.js';
import { input, bindInput, endFrame } from './input.js';
import { newGame, say, buyUpgrade, rotateStep, sellPrice, UPGRADES } from './state.js';
import { TOWER_KINDS, makeTower, towerAt, plotAt } from './towers.js';
import { traceBeams } from './beams.js';
import { spawnShade, updateShades, updateParticles } from './shades.js';
import { nightPlan, NIGHTS } from './waves.js';
import { draw } from './render.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cv');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);

let st = newGame();
st.testMode = params.has('test');
if (st.testMode) {
  st.test = { started: false, placed: false, rotated: false, beamLit: false, burned: false, shopOpened: false, bought: false };
  window.__TEST = st.test;
}
window.__game = { get state() { return st; }, FIELD };

bindInput(canvas, $('wrap'));

// ---------------------------------------------------------------- HUD / DOM
const hud = { night: $('h-night'), hp: $('h-hp'), hpfill: $('hpfill'), embers: $('h-embers'), left: $('h-left'), msg: $('msg'), btnNight: $('btn-night') };
const cards = [...document.querySelectorAll('.tcard')];

function refreshHud() {
  hud.night.textContent = `${Math.min(st.night, NIGHTS)} / ${NIGHTS}`;
  hud.hp.textContent = Math.max(0, Math.ceil(st.beaconHp));
  hud.hpfill.style.width = `${Math.max(0, (st.beaconHp / st.beaconMax) * 100)}%`;
  hud.hpfill.style.background = st.beaconHp / st.beaconMax < 0.3 ? 'var(--bad)' : '';
  hud.embers.textContent = st.embers;
  hud.left.textContent = st.phase === 'assault' ? st.spawnLeft + st.shades.length : 0;
  hud.msg.textContent = st.msgT > 0 ? st.msg : '';
  hud.btnNight.disabled = st.phase !== 'build';
  hud.btnNight.textContent = st.phase === 'build' ? `Begin night ${st.night}` : (st.phase === 'assault' ? `Night ${st.night} — hold the light` : 'PRISMWAKE');
  for (const c of cards) {
    c.classList.toggle('sel', c.dataset.kind === st.selectedKind);
    c.classList.toggle('cant', TOWER_KINDS[c.dataset.kind].cost > st.embers);
  }
}

function buildShop() {
  const grid = $('shop-grid');
  grid.innerHTML = '';
  for (const up of UPGRADES) {
    const lvl = st.upgrades[up.id];
    const maxed = lvl >= up.max;
    const price = maxed ? null : up.cost(lvl);
    const row = document.createElement('div');
    row.className = 'urow';
    row.innerHTML = `<div><div class="nm">${up.name}</div><div class="ds">${up.desc}</div></div>
      <div class="pips">${'●'.repeat(lvl)}${'○'.repeat(up.max - lvl)}</div>`;
    const btn = document.createElement('button');
    btn.textContent = maxed ? 'MAX' : `Buy · ${price} ✦`;
    btn.disabled = maxed || st.embers < price;
    btn.dataset.buy = up.id;
    btn.addEventListener('click', () => {
      if (buyUpgrade(st, up.id)) { sfx.chime(); buildShop(); refreshHud(); }
      btn.blur();
    });
    row.appendChild(btn);
    grid.appendChild(row);
  }
  $('shop-embers').textContent = st.embers;
}

function showEnd() {
  const won = st.phase === 'won';
  $('end-title').textContent = won ? 'THE LIGHT HOLDS' : 'THE LIGHT GOES OUT';
  $('end-title').style.color = won ? 'var(--amber)' : 'var(--bad)';
  $('end-line').textContent = won
    ? 'Seven nights, and the beacon still burns. The Murk withdraws to wherever dark things wait.'
    : `The beacon fell on night ${st.night}. The dark keeps what it takes — this time.`;
  const rows = [
    ['Nights held', st.stats.nightsHeld],
    ['Murk burned', st.stats.burned],
    ['Embers earned', st.stats.embersEarned],
    ['Towers built', st.stats.built],
    ['Mirror turns, mid-night', st.stats.turned],
  ];
  $('end-stats').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td class="v">${v}</td></tr>`).join('');
  $('ov-end').classList.remove('hidden');
}

// ------------------------------------------------------------------- phases
function beginNight() {
  if (st.phase !== 'build') return;
  st.plan = nightPlan(st.night);
  st.spawnLeft = st.plan.count;
  st.spawnT = 0.4;
  st.phase = 'assault';
  say(st, `Night ${st.night} — the Murk is coming. Turn your mirrors; the beam moves while the night does.`, 4);
}

function nightHeld() {
  st.stats.nightsHeld += 1;
  st.embers += st.plan.clearBonus;
  st.stats.embersEarned += 0; // the bonus is the watch's wage, not burn pay
  if (st.night >= NIGHTS) {
    st.phase = 'won';
    sfx.sting(true);
    showEnd();
    return;
  }
  st.night += 1;
  st.phase = 'shop';
  if (st.test) st.test.shopOpened = true;
  buildShop();
  $('ov-shop').classList.remove('hidden');
  sfx.chime();
}

function reset() {
  const testMode = st.testMode, test = st.test;
  st = newGame();
  st.testMode = testMode; st.test = test;
  window.__game = { get state() { return st; }, FIELD };
  $('ov-end').classList.add('hidden');
  $('ov-shop').classList.add('hidden');
  $('ov-title').classList.add('hidden');
  st.phase = 'build';
  say(st, 'The old watch left two mirrors standing. Build, then begin night 1.', 4);
}

// -------------------------------------------------------------------- input
for (const c of cards) {
  c.addEventListener('click', () => { st.selectedKind = c.dataset.kind; st.selectedTower = null; refreshHud(); });
}
$('btn-begin').addEventListener('click', (e) => {
  sfx.unlock();
  $('ov-title').classList.add('hidden');
  st.phase = 'build';
  if (st.test) st.test.started = true;
  say(st, 'Build on the stone plots — then begin night 1. The two standing mirrors are yours.', 4.5);
  e.currentTarget.blur();
});
$('btn-night').addEventListener('click', (e) => { beginNight(); e.currentTarget.blur(); });
$('btn-pause').addEventListener('click', (e) => { st.paused = !st.paused; e.currentTarget.blur(); });
$('btn-face').addEventListener('click', (e) => {
  $('ov-shop').classList.add('hidden');
  st.phase = 'build';
  say(st, `Night ${st.night} next. Rearrange the light, then begin.`, 3.5);
  e.currentTarget.blur();
});
$('btn-again').addEventListener('click', (e) => { reset(); e.currentTarget.blur(); });

function rotateSelected(dir) {
  const t = st.selectedTower;
  if (!t || (t.kind !== 'mirror' && t.kind !== 'lantern')) return;
  t.angle += rotateStep(st) * dir;
  st.stats.turned += 1;
  if (st.test) st.test.rotated = true;
}

function handleFieldInput() {
  st.hoverPlot = input.inside ? plotAt(st, input.x, input.y) : null;
  const hoverTower = input.inside ? towerAt(st, input.x, input.y) : null;

  if (input.pressed.has('Digit1')) { st.selectedKind = 'mirror'; st.selectedTower = null; }
  if (input.pressed.has('Digit2')) { st.selectedKind = 'prism'; st.selectedTower = null; }
  if (input.pressed.has('Digit3')) { st.selectedKind = 'lantern'; st.selectedTower = null; }
  if (input.pressed.has('KeyQ')) rotateSelected(-1);
  if (input.pressed.has('KeyE')) rotateSelected(1);
  if (input.wheel !== 0 && st.selectedTower) rotateSelected(Math.sign(input.wheel));
  if (input.pressed.has('Space') && st.phase === 'build') beginNight();
  if (input.pressed.has('KeyP')) st.paused = !st.paused;
  if (input.pressed.has('KeyR') && (st.phase === 'won' || st.phase === 'lost')) reset();

  if (input.rClicked && hoverTower) {
    st.embers += sellPrice(hoverTower);
    st.towers = st.towers.filter((t) => t !== hoverTower);
    if (st.selectedTower === hoverTower) st.selectedTower = null;
    say(st, `${hoverTower.def.name} sold back to the Emberwright.`, 2);
    return;
  }
  if (!input.clicked) return;
  if (hoverTower) { st.selectedTower = hoverTower; return; }
  const plot = st.hoverPlot;
  if (plot) {
    const def = TOWER_KINDS[st.selectedKind];
    if (st.embers < def.cost) { say(st, `Not enough embers for a ${def.name.toLowerCase()} — burn more of the Murk.`, 2.6); return; }
    st.embers -= def.cost;
    const t = makeTower(st.selectedKind, plot);
    st.towers.push(t);
    st.selectedTower = t;
    st.stats.built += 1;
    if (st.test) st.test.placed = true;
    sfx.place();
    say(st, `${def.name} raised. ${t.kind === 'prism' ? 'Light that strikes it splits in two.' : 'Turn it with Q / E — even mid-assault.'}`, 2.6);
  } else {
    st.selectedTower = null;
  }
}

// --------------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (st.testMode) dt *= 3;               // the drill runs the night at triple pace
  if (!st.paused) {
    st.time += dt;
    if (st.msgT > 0) st.msgT -= dt;
    if (st.phase === 'build' || st.phase === 'assault') handleFieldInput();
    if (st.phase === 'assault') {
      st.spawnT -= dt;
      if (st.spawnLeft > 0 && st.spawnT <= 0) {
        spawnShade(st);
        st.spawnLeft -= 1;
        st.spawnT = st.plan.interval;
      }
    }
    const segments = traceBeams(st);
    if (st.phase === 'assault') {
      updateShades(st, dt, segments);
      if (st.beaconHp <= 0 && st.phase === 'assault') {
        st.phase = 'lost';
        sfx.sting(false);
        showEnd();
      } else if (st.spawnLeft === 0 && st.shades.length === 0 && st.phase === 'assault') {
        nightHeld();
      }
    }
    updateParticles(st, dt);
    draw(ctx, st, segments);
    refreshHud();
  }
  endFrame();
}

// ------------------------------------------------------------- shot scenes
function setupShot(scene) {
  const addTower = (kind, plotIdx, angle) => {
    const t = makeTower(kind, FIELD.plots[plotIdx]);
    t.angle = angle;
    st.towers.push(t);
    return t;
  };
  if (scene === 'title') {
    st.phase = 'title';
  } else if (scene === 'combat') {
    $('ov-title').classList.add('hidden');
    st.towers[1].angle = Math.PI / 4;                       // old watch mirror: catches the beam, drops it south
    addTower('mirror', 2, Math.PI / 4);                     // turns the fallen beam east again
    addTower('prism', 12, 0);                               // the split, far east
    addTower('lantern', 10, 0.5);                           // a light of its own, north-east
    st.plan = nightPlan(3);
    st.phase = 'assault';
    st.night = 3; st.embers = 86; st.beaconHp = 78;
    st.spawnLeft = 9;
    const shadeAt = (x, y, kind, hpFrac) => {
      const def = { shade: 30, swift: 18, brute: 120 }[kind];
      const r = kind === 'brute' ? 20 : (kind === 'swift' ? 10 : 13);
      st.shades.push({ kind, def: { hp: def, sp: 30, r, ember: 6, dmg: 5 }, r,
        x, y, hp: def * hpFrac, max: def * 1.44, phase: x * 0.01, lit: false, burnT: 0 });
    };
    shadeAt(330, 470, 'shade', 0.55);                       // burning in the fallen beam
    shadeAt(700, 560, 'shade', 0.7);                        // burning past the second mirror
    shadeAt(905, 520, 'swift', 0.8);                        // in the prism's split fan
    shadeAt(1010, 300, 'shade', 1);
    shadeAt(1120, 430, 'brute', 0.9);
    shadeAt(1080, 190, 'swift', 1);
    shadeAt(960, 640, 'shade', 1);
    st.selectedTower = st.towers[1];
  } else if (scene === 'shop') {
    st.night = 3; st.stats.nightsHeld = 2; st.embers = 214;
    st.upgrades.core = 1; st.upgrades.lens = 1;
    st.phase = 'shop';
    buildShop();
    $('ov-shop').classList.remove('hidden');
    $('ov-title').classList.add('hidden');
  } else if (scene === 'victory') {
    addTower('mirror', 4, -Math.PI / 6);
    addTower('prism', 9, 0);
    addTower('lantern', 7, 0.2);
    st.phase = 'won';
    st.night = 7;
    st.stats = { burned: 148, embersEarned: 1210, turned: 96, built: 11, nightsHeld: 7 };
    st.embers = 214;
    $('ov-title').classList.add('hidden');
    showEnd();
  } else if (scene === 'defeat') {
    st.phase = 'lost';
    st.night = 5; st.beaconHp = 0;
    st.stats = { burned: 87, embersEarned: 640, turned: 41, built: 8, nightsHeld: 4 };
    $('ov-title').classList.add('hidden');
    showEnd();
  }
  let frames = 0;
  const tick = () => { if (++frames > 15) { window.__shotReady = true; return; } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

if (params.get('shot')) setupShot(params.get('shot'));
requestAnimationFrame(frame);
