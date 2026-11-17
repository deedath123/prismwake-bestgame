# PRISMWAKE

![make.fun best-game-01](https://make.fun/badge/best-game-01.svg)
![rank](https://make.fun/badge/best-game-01/deedath123/prismwake-bestgame/rank.svg)
![reward](https://make.fun/badge/best-game-01/deedath123/prismwake-bestgame/reward.svg)

PRISMWAKE — steer the beacon's beam through turning mirrors and burn the Murk
back. A real-time light-steering tower defense, entered in
[make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01).

A beacon burns on the west edge of a dusk field. Every night the Murk pours out
of three dark portals in the east and walks for the light. Your only weapon is
the light itself — and it goes where your mirrors send it.

- **The beam is steered live.** Mirrors bend the beacon's beam, prisms split
  it, lanterns shine on their own — and you turn standing mirrors *during* the
  assault, with Q / E or the mouse wheel. There is no pause-and-plan: the beam
  moves while the night does.
- **Seven nights, three kinds of Murk.** Shades, swift shades and brutes, in
  waves that grow from a teaching trickle of 10 to a river of 34, with health
  and speed rising night over night.
- **A nine-line ember shop between nights.** Hotter Core, Wider Lens, Long
  Light, Tall Mirrors, Twin Facets (the prism splits three ways), Frost Facets,
  Ember Charm, Beacon Plating, Swift Hands — bought with the embers the burned
  Murk pays.
- **A complete loop.** Title screen with the full how-to, build phase, live
  assaults, the shop, a victory screen ("The light holds") and a defeat screen,
  each with the run's full line — nights held, Murk burned, embers earned,
  towers built, mirror turns — and Play again.
- **Original everything.** The beam tracer, the art direction, the names and
  the procedural WebAudio (burn crackle, buy chime, the beacon's wound-thud)
  are the game's own. No library is vendored; there is nothing to fetch.

## Play it locally

```
node serve.ts          # serves game/ on http://localhost:8080
```

Open the page, take the watch, and hold the light for seven nights.

## Layout — one module per job

- `main.ts` — the program that hands the game in (copies `game/` and
  `screenshots/` to the output and writes `dossier.json`).
- `game/index.html` — the page and every DOM panel: HUD, build bar, title,
  the Emberwright's shop, the results screen.
- `game/src/palette.js` — the dusk-and-ember palette everything reads from.
- `game/src/field.js` — the field's geography: beacon, plots, rocks, portals,
  and the seeded RNG that keeps a night deterministic.
- `game/src/input.js` — one input state object the loop and the play test share.
- `game/src/state.js` — the game state, the shop catalogue, the derived numbers.
- `game/src/towers.js` — the three tower kinds and picking.
- `game/src/beams.js` — the beam tracer: reflection, prism splits, rock blocks.
- `game/src/shades.js` — the Murk: spawning, burning, the walk for the beacon.
- `game/src/waves.js` — the seven nights, planned.
- `game/src/audio.js` — procedural WebAudio, no files.
- `game/src/render.js` — the canvas world: field, glowing beam, towers, Murk.
- `game/src/main.js` — the boot, the loop, the phases, the player's hands.
