// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (start, pulse, pause, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost or counted twice.
// A held pointer steers the keeper toward it; a quick tap fires a pulse.

export const ACTION_CONFIRM = 1;
export const ACTION_PULSE = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const PULSE = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let pointerHeld = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerDownAt = 0;
  let pointerMoved = false;

  function press(code) {
    if (LEFT.has(code)) left = true;
    else if (RIGHT.has(code)) right = true;
    else if (UP.has(code)) up = true;
    else if (DOWN.has(code)) down = true;
    else if (CONFIRM.has(code)) actions |= ACTION_CONFIRM;
    else if (PULSE.has(code)) actions |= ACTION_PULSE;
    else if (PAUSE.has(code)) actions |= ACTION_PAUSE;
    else if (MUTE.has(code)) actions |= ACTION_MUTE;
  }

  function release(code) {
    if (LEFT.has(code)) left = false;
    else if (RIGHT.has(code)) right = false;
    else if (UP.has(code)) up = false;
    else if (DOWN.has(code)) down = false;
  }

  window.addEventListener('keydown', (event) => {
    if (
      LEFT.has(event.code) || RIGHT.has(event.code) || UP.has(event.code) ||
      DOWN.has(event.code) || CONFIRM.has(event.code) || PULSE.has(event.code) ||
      PAUSE.has(event.code) || MUTE.has(event.code)
    ) {
      if (!event.repeat) press(event.code);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => release(event.code));
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    pointerHeld = false;
  });

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const position = pointerPosition(event);
    pointerHeld = true;
    pointerMoved = false;
    pointerX = position.x;
    pointerY = position.y;
    pointerDownAt = performance.now();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointerHeld) return;
    const position = pointerPosition(event);
    if (Math.hypot(position.x - pointerX, position.y - pointerY) > 12) pointerMoved = true;
    pointerX = position.x;
    pointerY = position.y;
  });
  canvas.addEventListener('pointerup', () => {
    pointerHeld = false;
    if (!pointerMoved && performance.now() - pointerDownAt < 250) actions |= ACTION_PULSE;
  });
  canvas.addEventListener('pointercancel', () => {
    pointerHeld = false;
  });

  return {
    /** Normalised steering from the keys, or null when no key is held. */
    keyDirection() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** Pointer target while held, in canvas pixels, or null. */
    pointerTarget() {
      return pointerHeld ? { x: pointerX, y: pointerY } : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
