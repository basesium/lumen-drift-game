// The screenshot scenes behind ?shot=start|play|end|win. Each one plays the
// real rules forward from a fresh world, steered by a simple autopilot, so
// the frame is what a short game really looks like and the same seed always
// gives the same frame. The play pilot lights lanterns, gathers fireflies
// and pulses wisps that get close; the end pilot never pulses and chases
// fireflies blindly, so it is caught out as a hurried player is.

import { FIELD, LANTERNS, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const WIN_LIMIT_SECONDS = 900;

/** Steer toward `target` while keeping clear of the nearest wisp. */
function steer(state, target, flee) {
  let x = target.x - state.player.x;
  let y = target.y - state.player.y;
  const length = Math.hypot(x, y) || 1;
  x /= length;
  y /= length;
  if (flee) {
    x += flee.x;
    y += flee.y;
  }
  const total = Math.hypot(x, y) || 1;
  return { x: x / total, y: y / total };
}

/**
 * One autopilot decision. `skill` 1 plays well (pulses, flees, lights
 * lanterns); skill 0 chases fireflies and never pulses.
 */
function autopilot(state, skill) {
  const player = state.player;
  let nearestWisp = null;
  let nearestDist = Infinity;
  for (const wisp of state.wisps) {
    const dist = Math.hypot(wisp.x - player.x, wisp.y - player.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestWisp = wisp;
    }
  }

  const pulse = skill === 1 && nearestWisp !== null && nearestDist < 115 && state.pulseCooldown <= 0;

  // Flee a wisp that is close enough to hurt.
  let flee = null;
  if (nearestWisp !== null && nearestDist < 150) {
    const away = Math.hypot(nearestWisp.x - player.x, nearestWisp.y - player.y) || 1;
    const strength = (150 - nearestDist) / 90;
    flee = {
      x: ((player.x - nearestWisp.x) / away) * strength,
      y: ((player.y - nearestWisp.y) / away) * strength,
    };
  }

  // Head for the nearest unlit lantern; stand still once inside it to channel.
  let target = null;
  let targetDist = Infinity;
  for (let index = 0; index < state.lanterns.length; index += 1) {
    if (state.lanterns[index].lit) continue;
    const dist = Math.hypot(LANTERNS[index].x - player.x, LANTERNS[index].y - player.y);
    if (dist < targetDist) {
      targetDist = dist;
      target = LANTERNS[index];
    }
  }
  if (target !== null) {
    if (targetDist < 30 && !flee) return { move: { x: 0, y: 0 }, pulse };
    return { move: steer(state, target, flee), pulse };
  }

  // No lantern left to light: chase the nearest firefly.
  let firefly = null;
  let fireflyDist = Infinity;
  for (const item of state.fireflies) {
    const dist = Math.hypot(item.x - player.x, item.y - player.y);
    if (dist < fireflyDist) {
      fireflyDist = dist;
      firefly = item;
    }
  }
  if (firefly !== null) return { move: steer(state, firefly, flee), pulse };
  if (flee) return { move: flee, pulse };
  return { move: { x: 0, y: 0 }, pulse };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Returns null when the scene could not be staged
 * (the win pilot did not finish wave 5 in time).
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, null, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  const skill = name === 'end' ? 0 : 1;
  const limit = name === 'win' ? WIN_LIMIT_SECONDS : name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const decision = autopilot(world.state, skill);
    const events = world.step(STEP, decision.move, decision.pulse, false);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    if (events & EVENT_OVER) break;
  }
  if (name === 'win') return null;
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
