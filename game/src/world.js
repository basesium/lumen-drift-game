// Lumen Drift — the simulation. Pure fixed-step logic: no drawing, no sound,
// no DOM. The loop calls step() at 60 Hz with the player's steering and
// whether a pulse was fired; step() returns the events that happened, and
// main.js turns those into sounds and screen changes.
//
// The game: you are the Lantern Keeper of a night garden. Shadow wisps
// drift in from the dark. Stand by each of the five lantern posts to light
// it — a lit lantern drives wisps back and scores. Light all five to clear
// the wave; clear wave 5 to win. Gather fireflies for points and chain them
// into combos; spend your lantern pulse (Space / tap) to burst wisps around
// you. Three hits and the night takes the garden.

import {
  COMBO_WINDOW_SECONDS,
  FIELD,
  FIREFLY_SPAWN_SECONDS,
  LANTERN_CHANNEL_SECONDS,
  LANTERN_LIT_SCORE,
  LANTERN_RADIUS,
  LANTERN_REPEL_RADIUS,
  LANTERNS,
  LIVES,
  MAX_FIREFLIES,
  PLAYER,
  PULSE_COOLDOWN_SECONDS,
  PULSE_RADIUS,
  PULSE_SCORE,
  FIREFLY_SCORE,
  INVULNERABLE_SECONDS,
  WAVE_CLEAR_SCORE,
  WIN_WAVE,
  WISP_KINDS,
  wispsForWave,
  wispSpeed,
} from './config.js';
import { createRandom, pick } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_LANTERN = 8;
export const EVENT_WAVE = 16;
export const EVENT_PULSE = 32;
export const EVENT_COLLECT = 64;

const DART_LUNGE_SECONDS = 0.55;
const DART_PAUSE_SECONDS = 1.3;
const DART_LUNGE_SPEED = 265;
const REINFORCE_SECONDS = 4;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnEdgePosition(random) {
  const side = Math.floor(random() * 4);
  const margin = 30;
  if (side === 0) return { x: margin + random() * (FIELD.width - margin * 2), y: margin };
  if (side === 1) return { x: margin + random() * (FIELD.width - margin * 2), y: FIELD.height - margin };
  if (side === 2) return { x: margin, y: margin + random() * (FIELD.height - margin * 2) };
  return { x: FIELD.width - margin, y: margin + random() * (FIELD.height - margin * 2) };
}

function kindForWave(wave, random) {
  const roll = random();
  if (wave >= 3 && roll < 0.22) return 'dart';
  if (wave >= 2 && roll < 0.42) return 'shade';
  return 'chaser';
}

export function createWorld(seed) {
  const random = createRandom(seed);
  const state = {
    seed,
    time: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    lives: LIVES,
    wave: 1,
    player: { x: PLAYER.startX, y: PLAYER.startY },
    invulnerable: 0,
    channelLantern: -1,
    pulseCooldown: 0,
    pulseFlash: 0,
    banner: '',
    bannerTimer: 0,
    wisps: [],
    fireflies: [],
    lanterns: [],
    fireflyTimer: 1,
    reinforceTimer: 0,
    lanternsLitTotal: 0,
    over: false,
    won: false,
  };

  function makeWisp(kind) {
    const position = spawnEdgePosition(random);
    return {
      kind,
      x: position.x,
      y: position.y,
      hits: WISP_KINDS[kind].hits,
      radius: WISP_KINDS[kind].radius,
      flash: 0,
      mode: 'chase',
      modeTimer: 0.5 + random() * 1.5,
      angle: 0,
      wander: random() * Math.PI * 2,
    };
  }

  function spawnFirefly() {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      x = 40 + random() * (FIELD.width - 80);
      y = 40 + random() * (FIELD.height - 80);
      if (distance(x, y, state.player.x, state.player.y) > 120) break;
    }
    state.fireflies.push({ x, y, phase: random() * Math.PI * 2, vx: 0, vy: 0 });
  }

  function startWave(wave) {
    state.wave = wave;
    state.lanterns = LANTERNS.map(() => ({ lit: false, progress: 0 }));
    state.wisps = [];
    const count = wispsForWave(wave);
    for (let index = 0; index < count; index += 1) state.wisps.push(makeWisp(kindForWave(wave, random)));
    state.fireflies = [];
    for (let index = 0; index < 3; index += 1) spawnFirefly();
    state.banner = wave === 1 ? 'Light all five lanterns' : `Wave ${wave} — the dark thickens`;
    state.bannerTimer = 2.4;
    state.reinforceTimer = REINFORCE_SECONDS;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.lives = LIVES;
    state.player.x = PLAYER.startX;
    state.player.y = PLAYER.startY;
    state.invulnerable = 0;
    state.channelLantern = -1;
    state.pulseCooldown = 0;
    state.pulseFlash = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.over = false;
    state.won = false;
    state.fireflyTimer = 1;
    state.lanternsLitTotal = 0;
    startWave(1);
  }

  function movePlayer(dt, move) {
    if (!move) return;
    const length = Math.hypot(move.x, move.y);
    if (length < 0.05) return;
    const nx = move.x / (length || 1);
    const ny = move.y / (length || 1);
    state.player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, state.player.x + nx * PLAYER.speed * dt));
    state.player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, state.player.y + ny * PLAYER.speed * dt));
  }

  function firePulse() {
    if (state.pulseCooldown > 0) return EVENT_NONE;
    state.pulseCooldown = PULSE_COOLDOWN_SECONDS;
    state.pulseFlash = 0.4;
    let events = EVENT_PULSE;
    state.wisps = state.wisps.filter((wisp) => {
      if (distance(wisp.x, wisp.y, state.player.x, state.player.y) > PULSE_RADIUS + wisp.radius) return true;
      wisp.hits -= 1;
      if (wisp.hits > 0) {
        wisp.flash = 0.4;
        return true;
      }
      state.score += WISP_KINDS[wisp.kind].score;
      return false;
    });
    return events;
  }

  function stepWisps(dt) {
    for (const wisp of state.wisps) {
      if (wisp.flash > 0) wisp.flash -= dt;
      const dx = state.player.x - wisp.x;
      const dy = state.player.y - wisp.y;
      const dist = Math.hypot(dx, dy) || 1;
      let speed = wispSpeed(wisp.kind, state.wave);
      let mx = dx / dist;
      let my = dy / dist;

      // A lit lantern pushes wisps away from itself.
      for (let index = 0; index < state.lanterns.length; index += 1) {
        if (!state.lanterns[index].lit) continue;
        const post = LANTERNS[index];
        const repelDist = distance(wisp.x, wisp.y, post.x, post.y);
        if (repelDist < LANTERN_REPEL_RADIUS + wisp.radius) {
          const push = (LANTERN_REPEL_RADIUS + wisp.radius - repelDist) / (LANTERN_REPEL_RADIUS + wisp.radius);
          mx += ((wisp.x - post.x) / (repelDist || 1)) * push * 1.6;
          my += ((wisp.y - post.y) / (repelDist || 1)) * push * 1.6;
        }
      }

      if (wisp.kind === 'dart') {
        wisp.modeTimer -= dt;
        if (wisp.mode === 'pause') {
          if (wisp.modeTimer <= 0) {
            wisp.mode = 'lunge';
            wisp.modeTimer = DART_LUNGE_SECONDS;
            wisp.angle = Math.atan2(dy, dx);
          }
          mx = 0;
          my = 0;
        } else if (wisp.mode === 'lunge') {
          speed = DART_LUNGE_SPEED;
          mx = Math.cos(wisp.angle);
          my = Math.sin(wisp.angle);
          if (wisp.modeTimer <= 0) {
            wisp.mode = 'pause';
            wisp.modeTimer = DART_PAUSE_SECONDS;
          }
        }
      } else {
        // Wisps wander a little so they never march in a perfect line.
        wisp.wander += (random() - 0.5) * dt * 2;
        mx += Math.cos(wisp.wander) * 0.25;
        my += Math.sin(wisp.wander) * 0.25;
      }

      const length = Math.hypot(mx, my) || 1;
      wisp.x += (mx / length) * speed * dt;
      wisp.y += (my / length) * speed * dt;
      wisp.x = Math.min(FIELD.width - wisp.radius, Math.max(wisp.radius, wisp.x));
      wisp.y = Math.min(FIELD.height - wisp.radius, Math.max(wisp.radius, wisp.y));
    }
  }

  function stepLanterns(dt) {
    let channel = -1;
    for (let index = 0; index < state.lanterns.length; index += 1) {
      const lantern = state.lanterns[index];
      if (lantern.lit) continue;
      const post = LANTERNS[index];
      if (distance(state.player.x, state.player.y, post.x, post.y) < LANTERN_RADIUS) {
        channel = index;
        lantern.progress += dt / LANTERN_CHANNEL_SECONDS;
        if (lantern.progress >= 1) {
          lantern.lit = true;
          lantern.progress = 1;
          state.lanternsLitTotal += 1;
          state.score += LANTERN_LIT_SCORE;
          return { event: EVENT_LANTERN, channel: -1 };
        }
      } else {
        lantern.progress = Math.max(0, lantern.progress - dt * 0.5);
      }
    }
    return { event: EVENT_NONE, channel };
  }

  function stepFireflies(dt) {
    state.fireflyTimer -= dt;
    if (state.fireflyTimer <= 0) {
      state.fireflyTimer = FIREFLY_SPAWN_SECONDS;
      if (state.fireflies.length < MAX_FIREFLIES) spawnFirefly();
    }
    for (const firefly of state.fireflies) {
      firefly.phase += dt * 1.5;
      firefly.x += Math.cos(firefly.phase) * 14 * dt;
      firefly.y += Math.sin(firefly.phase * 1.3) * 14 * dt;
    }
  }

  function step(dt, move, pulse, attract) {
    state.time += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.pulseFlash > 0) state.pulseFlash -= dt;
    if (state.invulnerable > 0) state.invulnerable -= dt;
    if (state.pulseCooldown > 0) state.pulseCooldown -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    if (attract) {
      // Title-screen garden: fireflies drift and a few wisps wander harmlessly.
      stepFireflies(dt);
      for (const wisp of state.wisps) {
        wisp.wander += dt * 0.6;
        wisp.x += Math.cos(wisp.wander) * 30 * dt;
        wisp.y += Math.sin(wisp.wander) * 30 * dt;
        wisp.x = Math.min(FIELD.width - 20, Math.max(20, wisp.x));
        wisp.y = Math.min(FIELD.height - 20, Math.max(20, wisp.y));
      }
      return EVENT_NONE;
    }

    let events = EVENT_NONE;
    movePlayer(dt, move);
    if (pulse) events |= firePulse();
    stepWisps(dt);
    stepFireflies(dt);

    // Collect fireflies.
    state.fireflies = state.fireflies.filter((firefly) => {
      if (distance(firefly.x, firefly.y, state.player.x, state.player.y) > PLAYER.radius + 16) return true;
      state.combo = Math.min(5, state.combo + 1);
      state.comboTimer = COMBO_WINDOW_SECONDS;
      state.score += FIREFLY_SCORE * state.combo;
      events |= EVENT_COLLECT;
      return false;
    });

    // Channel lanterns.
    const lanternStep = stepLanterns(dt);
    events |= lanternStep.event;
    state.channelLantern = lanternStep.channel;

    // A wisp touching the keeper costs a life.
    if (state.invulnerable <= 0) {
      for (let index = 0; index < state.wisps.length; index += 1) {
        const wisp = state.wisps[index];
        if (distance(wisp.x, wisp.y, state.player.x, state.player.y) < wisp.radius + PLAYER.radius - 2) {
          state.wisps.splice(index, 1);
          state.lives -= 1;
          state.combo = 0;
          state.comboTimer = 0;
          state.invulnerable = INVULNERABLE_SECONDS;
          events |= EVENT_HIT;
          if (state.lives <= 0) {
            state.over = true;
            events |= EVENT_OVER;
          }
          break;
        }
      }
    }

    // Reinforcements keep the pressure on once the wave thins out.
    if (!state.over && state.wisps.length < 2) {
      state.reinforceTimer -= dt;
      if (state.reinforceTimer <= 0) {
        state.reinforceTimer = REINFORCE_SECONDS;
        state.wisps.push(makeWisp(kindForWave(state.wave, random)));
        state.wisps.push(makeWisp(kindForWave(state.wave, random)));
      }
    }

    // All five lanterns lit: the wave is cleared.
    if (!state.over && state.lanterns.every((lantern) => lantern.lit)) {
      state.score += WAVE_CLEAR_SCORE;
      if (state.wave >= WIN_WAVE) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        events |= EVENT_WAVE;
        startWave(state.wave + 1);
      }
    }

    return events;
  }

  reset();

  return {
    state,
    reset,
    step,
    /** Random source, so the shot stager can steer with the same seed. */
    random,
  };
}
