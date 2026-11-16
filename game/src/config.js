// Lumen Drift — tuning constants. One place for every number the world and the
// renderer share, so balancing the game means editing this file, not hunting
// through the simulation.

export const STEP = 1 / 60;

export const FIELD = { width: 960, height: 600 };

export const PLAYER = {
  radius: 14,
  speed: 265,
  startX: FIELD.width / 2,
  startY: FIELD.height / 2,
};

export const LANTERNS = [
  { x: 150, y: 120 },
  { x: 810, y: 120 },
  { x: 150, y: 480 },
  { x: 810, y: 480 },
  { x: 480, y: 300 },
];
export const LANTERN_RADIUS = 46;
export const LANTERN_CHANNEL_SECONDS = 1.0;
export const LANTERN_REPEL_RADIUS = 95;
export const LANTERN_LIT_SCORE = 50;

export const LIVES = 3;
export const WIN_WAVE = 5;

export const PULSE_RADIUS = 125;
export const PULSE_COOLDOWN_SECONDS = 2.5;
export const PULSE_SCORE = 25;

export const FIREFLY_SCORE = 10;
export const COMBO_WINDOW_SECONDS = 4;
export const MAX_FIREFLIES = 6;
export const FIREFLY_SPAWN_SECONDS = 2.2;

export const WAVE_CLEAR_SCORE = 200;

export const INVULNERABLE_SECONDS = 2;

// Wisp kinds: chaser (fast, fragile), shade (slow, takes two pulses),
// dart (charges in a straight line, then pauses).
export const WISP_KINDS = {
  chaser: { radius: 13, speed: 78, hits: 1, score: 25 },
  shade: { radius: 21, speed: 46, hits: 2, score: 40 },
  dart: { radius: 11, speed: 60, hits: 1, score: 35 },
};

export function wispsForWave(wave) {
  return 4 + 2 * wave;
}

export function wispSpeed(kind, wave) {
  return WISP_KINDS[kind].speed + wave * 7;
}
