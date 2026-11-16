// Lumen Drift — everything the player sees. One canvas, drawn fresh every
// frame from the world state: the night garden, the lanterns, the wisps, the
// keeper, the HUD and the title / pause / end screens. No images, no fonts
// loaded from anywhere — every shape is drawn with the canvas API.

import { FIELD, LANTERN_RADIUS, LANTERNS, PLAYER, PULSE_COOLDOWN_SECONDS, PULSE_RADIUS } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

const PALETTE = {
  skyTop: '#0b1026',
  skyBottom: '#16213d',
  ground: '#12291f',
  groundEdge: '#0e211a',
  grass: '#1e4d33',
  stone: '#2c3550',
  lanternPost: '#5a4632',
  lanternWarm: '#ffc95e',
  lanternGlow: 'rgba(255, 201, 94, 0.55)',
  firefly: '#ffe98a',
  wisp: '#241a3a',
  wispRim: '#9b7bff',
  shadeRim: '#ff6b9d',
  dartRim: '#6be3ff',
  keeper: '#2ec4a6',
  keeperDark: '#177a66',
  text: '#f2ead8',
  dim: '#a8b3c7',
};

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  // Garden dressing, fixed for a seed so the scene is stable between runs.
  const decorRandom = createRandom(seed * 7919 + 13);
  const stars = [];
  for (let index = 0; index < 70; index += 1) {
    stars.push({ x: decorRandom() * FIELD.width, y: decorRandom() * 240, r: 0.6 + decorRandom() * 1.4, twinkle: decorRandom() * Math.PI * 2 });
  }
  const tufts = [];
  for (let index = 0; index < 46; index += 1) {
    tufts.push({ x: decorRandom() * FIELD.width, y: 60 + decorRandom() * (FIELD.height - 90), size: 5 + decorRandom() * 9 });
  }
  const stones = [];
  for (let index = 0; index < 10; index += 1) {
    stones.push({ x: decorRandom() * FIELD.width, y: 80 + decorRandom() * (FIELD.height - 120), r: 4 + decorRandom() * 7 });
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyBottom);
    gradient.addColorStop(0.55, PALETTE.ground);
    gradient.addColorStop(1, PALETTE.groundEdge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Moon.
    const moon = ctx.createRadialGradient(880, 62, 6, 880, 62, 60);
    moon.addColorStop(0, 'rgba(240, 236, 210, 0.95)');
    moon.addColorStop(0.25, 'rgba(240, 236, 210, 0.35)');
    moon.addColorStop(1, 'rgba(240, 236, 210, 0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(880, 62, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0ecd2';
    ctx.beginPath();
    ctx.arc(880, 62, 24, 0, Math.PI * 2);
    ctx.fill();

    for (const star of stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.4 + star.twinkle);
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Garden floor: a soft path ring around the centre lantern.
    ctx.strokeStyle = 'rgba(242, 234, 216, 0.07)';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.ellipse(FIELD.width / 2, FIELD.height / 2, 330, 210, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (const stone of stones) {
      ctx.fillStyle = PALETTE.stone;
      ctx.beginPath();
      ctx.ellipse(stone.x, stone.y, stone.r, stone.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const tuft of tufts) {
      ctx.strokeStyle = PALETTE.grass;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tuft.x - tuft.size / 2, tuft.y);
      ctx.lineTo(tuft.x - tuft.size / 4, tuft.y - tuft.size);
      ctx.moveTo(tuft.x, tuft.y);
      ctx.lineTo(tuft.x, tuft.y - tuft.size - 2);
      ctx.moveTo(tuft.x + tuft.size / 2, tuft.y);
      ctx.lineTo(tuft.x + tuft.size / 4, tuft.y - tuft.size);
      ctx.stroke();
    }
  }

  function drawLantern(post, lantern, time) {
    // Post and hanging lamp.
    ctx.strokeStyle = PALETTE.lanternPost;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(post.x, post.y + 26);
    ctx.lineTo(post.x, post.y - 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(post.x, post.y - 14);
    ctx.lineTo(post.x + 16, post.y - 14);
    ctx.stroke();

    if (lantern.lit) {
      const flicker = 0.85 + 0.15 * Math.sin(time * 5 + post.x);
      const glow = ctx.createRadialGradient(post.x + 16, post.y - 6, 4, post.x + 16, post.y - 6, 70 * flicker);
      glow.addColorStop(0, PALETTE.lanternGlow);
      glow.addColorStop(1, 'rgba(255, 201, 94, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(post.x + 16, post.y - 6, 70 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.lanternWarm;
      ctx.beginPath();
      ctx.arc(post.x + 16, post.y - 6, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(242, 234, 216, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(post.x + 16, post.y - 6, 8, 0, Math.PI * 2);
      ctx.stroke();
      // Channel ring: fills while the keeper stands close.
      if (lantern.progress > 0) {
        ctx.strokeStyle = PALETTE.lanternWarm;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(post.x + 16, post.y - 6, 14, -Math.PI / 2, -Math.PI / 2 + lantern.progress * Math.PI * 2);
        ctx.stroke();
      }
      // Hint ring showing where to stand.
      ctx.strokeStyle = 'rgba(255, 201, 94, 0.18)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(post.x, post.y + 8, LANTERN_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawFirefly(firefly, time) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 3 + firefly.phase);
    const glow = ctx.createRadialGradient(firefly.x, firefly.y, 1, firefly.x, firefly.y, 16 * pulse);
    glow.addColorStop(0, 'rgba(255, 233, 138, 0.9)');
    glow.addColorStop(1, 'rgba(255, 233, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(firefly.x, firefly.y, 16 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.firefly;
    ctx.beginPath();
    ctx.arc(firefly.x, firefly.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWisp(wisp, time) {
    const rim = wisp.kind === 'shade' ? PALETTE.shadeRim : wisp.kind === 'dart' ? PALETTE.dartRim : PALETTE.wispRim;
    const wobble = Math.sin(time * 4 + wisp.x * 0.05) * 2;
    // Body: a dark blob with a glowing rim.
    ctx.fillStyle = wisp.flash > 0 ? '#ffffff' : PALETTE.wisp;
    ctx.beginPath();
    ctx.ellipse(wisp.x, wisp.y + wobble * 0.4, wisp.radius, wisp.radius * 0.9 + wobble * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Dart telegraphs its lunge with a bright ring.
    if (wisp.kind === 'dart' && wisp.mode === 'pause') {
      ctx.strokeStyle = `rgba(107, 227, 255, ${0.4 + 0.4 * Math.sin(time * 10)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, wisp.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Eyes.
    ctx.fillStyle = rim;
    const eyeGap = wisp.radius * 0.4;
    const eyeY = wisp.y - 2 + wobble * 0.4;
    ctx.beginPath();
    ctx.arc(wisp.x - eyeGap, eyeY, 2.6, 0, Math.PI * 2);
    ctx.arc(wisp.x + eyeGap, eyeY, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // A shade shows its two lives as a cracked second ring.
    if (wisp.kind === 'shade' && wisp.hits > 1) {
      ctx.strokeStyle = 'rgba(255, 107, 157, 0.6)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, wisp.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPlayer(state, time) {
    const player = state.player;
    if (state.invulnerable > 0 && Math.floor(time * 10) % 2 === 0) return; // blink while hurt
    // Lantern light around the keeper.
    const light = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 115);
    light.addColorStop(0, 'rgba(255, 214, 120, 0.28)');
    light.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 115, 0, Math.PI * 2);
    ctx.fill();

    // Cloak.
    ctx.fillStyle = PALETTE.keeper;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 16);
    ctx.quadraticCurveTo(player.x + 15, player.y - 4, player.x + 12, player.y + 14);
    ctx.quadraticCurveTo(player.x, player.y + 19, player.x - 12, player.y + 14);
    ctx.quadraticCurveTo(player.x - 15, player.y - 4, player.x, player.y - 16);
    ctx.fill();
    // Hood and face.
    ctx.fillStyle = PALETTE.keeperDark;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9c4';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Hand lantern.
    ctx.fillStyle = PALETTE.lanternWarm;
    ctx.beginPath();
    ctx.arc(player.x + 15, player.y + 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pulse ring while it bursts.
    if (state.pulseFlash > 0) {
      const progress = 1 - state.pulseFlash / 0.4;
      ctx.strokeStyle = `rgba(255, 214, 120, ${0.9 * (1 - progress)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 20 + progress * PULSE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(8, 12, 26, 0.55)';
    roundedRect(ctx, 12, 10, FIELD.width - 24, 46, 10);
    ctx.fill();

    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score ${state.score}`, 26, 28);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`Best ${Math.max(best, state.score)}`, 26, 46);

    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Wave ${state.wave} / 5`, FIELD.width / 2, 26);
    // Lantern dots under the wave label.
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = state.lanterns[index] && state.lanterns[index].lit ? PALETTE.lanternWarm : 'rgba(242, 234, 216, 0.25)';
      ctx.beginPath();
      ctx.arc(FIELD.width / 2 - 40 + index * 20, 46, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lives as hearts, top right.
    ctx.textAlign = 'right';
    ctx.font = '20px system-ui, sans-serif';
    let hearts = '';
    for (let index = 0; index < 3; index += 1) hearts += index < state.lives ? '♥' : '♡';
    ctx.fillStyle = '#ff7d9c';
    ctx.fillText(hearts, FIELD.width - 26, 34);

    // Pulse cooldown bar, bottom left.
    const barWidth = 150;
    const ready = state.pulseCooldown <= 0;
    ctx.fillStyle = 'rgba(8, 12, 26, 0.55)';
    roundedRect(ctx, 12, FIELD.height - 34, barWidth + 84, 24, 8);
    ctx.fill();
    ctx.fillStyle = ready ? PALETTE.lanternWarm : '#4a5878';
    const fill = ready ? 1 : 1 - state.pulseCooldown / PULSE_COOLDOWN_SECONDS;
    roundedRect(ctx, 16, FIELD.height - 28, barWidth * fill, 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ready ? 'Pulse ready — Space' : 'Pulse…', 16 + barWidth + 8, FIELD.height - 22);

    // Combo badge.
    if (state.combo > 1) {
      ctx.fillStyle = PALETTE.firefly;
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Combo ×${state.combo}`, FIELD.width - 26, FIELD.height - 22);
    }

    // Wave banner.
    if (state.bannerTimer > 0 && state.banner) {
      ctx.globalAlpha = Math.min(1, state.bannerTimer);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.banner, FIELD.width / 2, 110);
      ctx.globalAlpha = 1;
    }
  }

  function overlayPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(6, 9, 20, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = 'rgba(12, 18, 38, 0.92)';
    roundedRect(ctx, FIELD.width / 2 - 300, 130, 600, 330, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, FIELD.width / 2, 185);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 18px system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, 240 + index * 30);
    });
  }

  function draw(state, screen, best, muted) {
    const time = state.time;
    drawBackground(time);
    for (let index = 0; index < LANTERNS.length; index += 1) {
      drawLantern(LANTERNS[index], state.lanterns[index] || { lit: false, progress: 0 }, time);
    }
    for (const firefly of state.fireflies) drawFirefly(firefly, time);
    for (const wisp of state.wisps) drawWisp(wisp, time);
    if (screen !== SCREEN_TITLE) drawPlayer(state, time);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6, 9, 20, 0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.lanternWarm;
      ctx.font = '800 64px system-ui, sans-serif';
      ctx.fillText('LUMEN DRIFT', FIELD.width / 2, 170);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '400 21px system-ui, sans-serif';
      ctx.fillText('A lantern-keeper arcade survival', FIELD.width / 2, 212);
      ctx.font = '400 17px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText('Light all five lanterns to clear each wave — clear wave 5 to win.', FIELD.width / 2, 268);
      ctx.fillText('Move: WASD / arrows / drag   •   Pulse: Space / tap   •   Pause: P', FIELD.width / 2, 296);
      ctx.fillText('Gather fireflies to chain combos. Lit lanterns drive the wisps back.', FIELD.width / 2, 324);
      ctx.fillStyle = PALETTE.lanternWarm;
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillText('Press Space or click to play', FIELD.width / 2, 390);
      if (best > 0) {
        ctx.fillStyle = PALETTE.dim;
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillText(`Best score ${best}`, FIELD.width / 2, 428);
      }
    } else if (screen === SCREEN_PAUSED) {
      overlayPanel('PAUSED', ['Take a breath. The garden waits.', 'Press P or Space to keep playing', muted ? 'Sound: off (M to turn on)' : 'Sound: on (M to mute)'], PALETTE.dim);
    } else if (screen === SCREEN_OVER) {
      overlayPanel('THE NIGHT WINS', [
        `Score ${state.score}   •   Best ${Math.max(best, state.score)}`,
        `You reached wave ${state.wave} and lit ${state.lanternsLitTotal} lantern${state.lanternsLitTotal === 1 ? '' : 's'} in all`,
        'Tip: light a lantern, then fight from its glow — it drives wisps back.',
        'Press Space or click to try again',
      ], '#ff7d9c');
    } else if (screen === SCREEN_WIN) {
      overlayPanel('DAWN BREAKS', [
        `Score ${state.score}   •   Best ${Math.max(best, state.score)}`,
        'All five waves cleared — the garden glows again.',
        'Press Space or click to play again',
      ], PALETTE.lanternWarm);
    }
  }

  return { draw };
}
