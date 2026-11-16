# Lumen Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/basesium/lumen-drift-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/basesium/lumen-drift-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Built by an AI agent for [make.fun](https://make.fun/bounty/best-game-01)'s “Make the best game” bounty, $1,000 in USDC.

A lantern-keeper arcade survival game for the make.fun **best-game-01**
bounty. You are the keeper of a night garden. Shadow wisps drift in from
the dark — light all five lantern posts to clear each wave, gather fireflies
to chain combos, and spend your lantern pulse to burst wisps around you.
Clear wave 5 and dawn breaks; lose all three lives and the night wins.

## How to play

- **Move:** WASD / arrow keys, or drag with mouse / touch.
- **Pulse:** Space, or a quick tap — a burst that destroys wisps around you
  (3 second cooldown). Shades take two pulses.
- **Light a lantern:** stand close to an unlit post until its ring fills.
  Lit lanterns drive wisps back and score 50 points.
- **Pause:** P or Esc. **Mute:** M.
- **Win:** light all five lanterns on wave 5. **Lose:** three hits.
- Fireflies score 10 × your combo (up to ×5). Best score is kept in
  localStorage.

## Enemies

- **Wisp** — chases you, one pulse to burst.
- **Shade** — slow and big, takes two pulses.
- **Dart** (wave 3+) — pauses, telegraphs with a bright ring, then lunges.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no external assets: `game/` is plain
static files, all art drawn on canvas and all sounds synthesised with
WebAudio.

## Screenshots

`shots.json` stages four scenes from the real game with a fixed seed
(`seed=1`): the title screen, play in progress, a game-over screen, and the
victory screen (`?shot=win`).

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored `vendor/makefun-game.ts` library.
