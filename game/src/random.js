// A small seeded random number generator (mulberry32). The same seed always
// gives the same sequence, which is what makes the screenshot scenes
// repeatable: a shot is a real game played forward from a fixed seed.

export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `items` using `random`. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
