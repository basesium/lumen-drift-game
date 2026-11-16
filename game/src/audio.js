// Tiny WebAudio sound effects, synthesised on the spot — no audio files, no
// network. Every sound is a short oscillator blip; the first user gesture
// creates the AudioContext (browsers block audio before interaction).

const NOTES = {
  collect: [880, 1320],
  pulse: [220, 110],
  hit: [160, 90],
  lantern: [523, 659, 784],
  wave: [392, 523, 659, 784],
  win: [523, 659, 784, 1047, 1319],
  lose: [392, 330, 262, 196],
};

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(frequency, startAt, duration, type, volume) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime + startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + startAt);
    oscillator.stop(ctx.currentTime + startAt + duration + 0.02);
  }

  return {
    /** Play the named effect; unknown names are ignored. */
    play(name) {
      const notes = NOTES[name];
      if (!notes) return;
      notes.forEach((frequency, index) => {
        tone(frequency, index * 0.07, 0.16, name === 'hit' ? 'sawtooth' : 'sine', 0.12);
      });
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Unlock audio after a gesture so later effects can sound. */
    unlock() {
      ensure();
    },
  };
}
