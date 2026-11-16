// Lumen Drift — the game loop. A fixed 60 Hz simulation, decoupled from
// rendering: the world steps in STEP slices, the renderer draws the latest
// state, and sounds and screen changes come from the events each step
// returns. `?shot=start|play|end|win&seed=N` stages one screenshot scene
// instead of playing, and sets window.__shotReady when it is drawn.

import { FIELD, STEP } from './config.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_PULSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { createWorld, EVENT_COLLECT, EVENT_HIT, EVENT_LANTERN, EVENT_OVER, EVENT_PULSE, EVENT_WAVE, EVENT_WIN } from './world.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'lumen-drift-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private browsing or disabled storage: the game plays on regardless.
  }
}

function runShot(shot, seed) {
  const canvas = document.getElementById('game');
  const world = createWorld(seed);
  const renderer = createRenderer(canvas, seed);
  const staged = stageShot(shot, world);
  if (staged === null) {
    document.getElementById('status').textContent = `Shot ${shot} could not be staged.`;
    window.__shotReady = true;
    return;
  }
  renderer.draw(world.state, staged.screen, staged.best, false);
  document.getElementById('status').textContent = `Lumen Drift, ${shot} scene. Score ${world.state.score}.`;
  window.__shotReady = true;
}

function runGame() {
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');
  const audio = createAudio();
  const input = createInput(canvas);
  const world = createWorld(20261116);
  const renderer = createRenderer(canvas, world.state.seed);
  let best = loadBest();
  let screen = SCREEN_TITLE;
  let muted = false;
  let last = performance.now();
  let accumulator = 0;

  function announce(text) {
    status.textContent = text;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. Wave 1: light all five lanterns. ${world.state.lives} lives.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(
      won
        ? `You win. Dawn breaks over the garden. Score ${world.state.score}. Best ${best}.`
        : `Game over. Score ${world.state.score}. Best ${best}.`,
    );
  }

  function handleEvents(events) {
    if (events & EVENT_COLLECT) audio.play('collect');
    if (events & EVENT_PULSE) audio.play('pulse');
    if (events & EVENT_LANTERN) {
      audio.play('lantern');
      const lit = world.state.lanterns.filter((lantern) => lantern.lit).length;
      announce(`Lantern lit. ${lit} of 5. Score ${world.state.score}.`);
    }
    if (events & EVENT_WAVE) audio.play('wave');
    if (events & EVENT_HIT) {
      audio.play('hit');
      if (world.state.lives > 0) announce(`Hit. ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left.`);
    }
    if (events & EVENT_WIN) {
      audio.play('win');
      endGame(true);
    } else if (events & EVENT_OVER) {
      audio.play('lose');
      endGame(false);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & (ACTION_CONFIRM | ACTION_PULSE) && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_PULSE && screen === SCREEN_PLAY) {
      audio.unlock();
      handleEvents(world.step(0, null, true, false));
    }
  }

  function moveVector() {
    const keys = input.keyDirection();
    if (keys) return keys;
    const pointer = input.pointerTarget();
    if (!pointer) return null;
    // The pointer target is in canvas pixels; the field is the canvas.
    const dx = pointer.x - world.state.player.x;
    const dy = pointer.y - world.state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return null;
    return { x: dx / dist, y: dy / dist };
  }

  function step() {
    const events = world.step(STEP, moveVector(), false, false);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        world.step(STEP, null, false, true);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, muted);
  }

  // Leaving the tab pauses a running game rather than letting wisps close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Drift. Press Space or click to start.');
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed')) || 1;

if (shot) runShot(shot, seed);
else runGame();
