/**
 * Tiny synthesized sound effects: no audio files, everything is shaped from
 * oscillators and filtered noise on the fly. Silent until the player turns
 * the sound on (browsers need a gesture first anyway).
 */
export type Sound =
  | 'step'
  | 'stepWood'
  | 'cast'
  | 'plop'
  | 'splash'
  | 'bite'
  | 'catch'
  | 'fanfare'
  | 'miss'
  | 'pop'
  | 'rustle'
  | 'land'
  | 'crackle'
  | 'ribbit'
  | 'sit'
  | 'wave'
  | 'charge'
  | 'burst'
  | 'gong'
  | 'blip'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let enabled = false

function audio() {
  if (!enabled) return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(value: boolean) {
  enabled = value
  if (!value && ctx) void ctx.suspend()
  if (value) audio()
}

/** A gain envelope: quick attack, exponential release. */
function envelope(c: AudioContext, at: number, peak: number, attack: number, release: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
  g.connect(master!)
  return g
}

function burst(c: AudioContext, at: number, options: { type: BiquadFilterType; from: number; to?: number; q?: number; peak: number; attack: number; release: number }) {
  const src = c.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.8 + Math.random() * 0.4
  const filter = c.createBiquadFilter()
  filter.type = options.type
  filter.Q.value = options.q ?? 1
  filter.frequency.setValueAtTime(options.from, at)
  if (options.to) filter.frequency.exponentialRampToValueAtTime(options.to, at + options.attack + options.release)
  src.connect(filter).connect(envelope(c, at, options.peak, options.attack, options.release))
  src.start(at, Math.random() * 0.5)
  src.stop(at + options.attack + options.release + 0.05)
}

function tone(c: AudioContext, at: number, options: { type: OscillatorType; from: number; to?: number; peak: number; attack: number; release: number }) {
  const osc = c.createOscillator()
  osc.type = options.type
  osc.frequency.setValueAtTime(options.from, at)
  if (options.to) osc.frequency.exponentialRampToValueAtTime(options.to, at + options.attack + options.release)
  osc.connect(envelope(c, at, options.peak, options.attack, options.release))
  osc.start(at)
  osc.stop(at + options.attack + options.release + 0.05)
}

let lastStep = 0
export function organNote(hz: number) {
  if (!enabled) return
  const c = audio()
  if (!c) return
  const t = c.currentTime
  tone(c, t, { type: 'sine', from: hz, peak: 0.19, attack: 0.045, release: 0.9 })
  tone(c, t, { type: 'sine', from: hz * 2, peak: 0.045, attack: 0.08, release: 0.6 })
}

export function play(sound: Sound, strength = 1) {
  const c = audio()
  if (!c || document.hidden) return
  const t = c.currentTime + 0.005
  switch (sound) {
    case 'step':
      if (t - lastStep < 0.09) return
      lastStep = t
      burst(c, t, { type: 'lowpass', from: 900 + Math.random() * 300, peak: 0.05 * strength, attack: 0.005, release: 0.07 })
      break
    case 'stepWood':
      if (t - lastStep < 0.09) return
      lastStep = t
      tone(c, t, { type: 'triangle', from: 210 + Math.random() * 40, to: 150, peak: 0.07 * strength, attack: 0.003, release: 0.08 })
      burst(c, t, { type: 'bandpass', from: 1800, q: 2, peak: 0.03 * strength, attack: 0.002, release: 0.04 })
      break
    case 'cast':
      burst(c, t, { type: 'bandpass', from: 500, to: 3200, q: 1.5, peak: 0.12, attack: 0.12, release: 0.22 })
      break
    case 'plop':
      tone(c, t, { type: 'sine', from: 820, to: 240, peak: 0.12 * strength, attack: 0.004, release: 0.12 })
      break
    case 'splash':
      burst(c, t, { type: 'lowpass', from: 4000, to: 500, peak: 0.22 * strength, attack: 0.01, release: 0.45 })
      tone(c, t, { type: 'sine', from: 520, to: 180, peak: 0.08, attack: 0.005, release: 0.18 })
      break
    case 'bite':
      for (const [i, f] of [880, 1175].entries()) tone(c, t + i * 0.09, { type: 'square', from: f, peak: 0.05, attack: 0.005, release: 0.08 })
      break
    case 'catch':
    case 'fanfare': {
      const notes = sound === 'fanfare' ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]
      notes.forEach((f, i) => tone(c, t + i * 0.09, { type: 'triangle', from: f, peak: 0.11, attack: 0.01, release: i === notes.length - 1 ? 0.55 : 0.16 }))
      break
    }
    case 'miss':
      tone(c, t, { type: 'triangle', from: 392, to: 262, peak: 0.08, attack: 0.01, release: 0.4 })
      break
    case 'pop':
      burst(c, t, { type: 'highpass', from: 1200, peak: 0.25, attack: 0.002, release: 0.09 })
      tone(c, t, { type: 'square', from: 1400, to: 300, peak: 0.06, attack: 0.002, release: 0.1 })
      ;[784, 988, 1175, 1568].forEach((f, i) => tone(c, t + 0.12 + i * 0.07, { type: 'sine', from: f, peak: 0.07, attack: 0.01, release: 0.2 }))
      break
    case 'rustle':
      for (let i = 0; i < 5; i++) burst(c, t + i * 0.06, { type: 'bandpass', from: 2600 + Math.random() * 1400, q: 1.2, peak: 0.06, attack: 0.01, release: 0.09 })
      break
    case 'land':
      tone(c, t, { type: 'sine', from: 160, to: 60, peak: 0.2, attack: 0.005, release: 0.2 })
      burst(c, t, { type: 'lowpass', from: 700, peak: 0.12, attack: 0.005, release: 0.25 })
      break
    case 'crackle':
      for (let i = 0; i < 3; i++)
        burst(c, t + Math.random() * 0.25, { type: 'highpass', from: 2500 + Math.random() * 2500, peak: 0.035 * strength, attack: 0.001, release: 0.02 })
      break
    case 'ribbit':
      for (const d of [0, 0.13]) tone(c, t + d, { type: 'sawtooth', from: 180, to: 120, peak: 0.04, attack: 0.01, release: 0.09 })
      break
    case 'sit':
      tone(c, t, { type: 'sine', from: 330, to: 440, peak: 0.07, attack: 0.02, release: 0.18 })
      break
    case 'charge': {
      // A rising, trembling hum while energy gathers.
      const osc = c.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(70, t)
      osc.frequency.exponentialRampToValueAtTime(420, t + 2.5)
      const tremolo = c.createOscillator()
      tremolo.frequency.value = 18
      const depth = c.createGain()
      depth.gain.value = 20
      tremolo.connect(depth).connect(osc.frequency)
      const filter = c.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(400, t)
      filter.frequency.exponentialRampToValueAtTime(2400, t + 2.5)
      osc.connect(filter).connect(envelope(c, t, 0.08, 2.3, 0.3))
      osc.start(t)
      tremolo.start(t)
      osc.stop(t + 2.7)
      tremolo.stop(t + 2.7)
      burst(c, t, { type: 'bandpass', from: 300, to: 2400, q: 0.8, peak: 0.05, attack: 2.3, release: 0.3 })
      break
    }
    case 'burst':
      tone(c, t, { type: 'triangle', from: 82, to: 27, peak: 0.36, attack: 0.003, release: 0.33 })
      burst(c, t + 0.028, { type: 'bandpass', from: 580, to: 120, q: 1.1, peak: 0.24, attack: 0.007, release: 0.36 })
      burst(c, t, { type: 'lowpass', from: 6000, to: 200, peak: 0.35, attack: 0.005, release: 1.1 })
      tone(c, t, { type: 'sine', from: 140, to: 40, peak: 0.3, attack: 0.005, release: 0.7 })
      ;[523, 784, 1047].forEach((f, i) => tone(c, t + 0.05 + i * 0.06, { type: 'triangle', from: f, peak: 0.08, attack: 0.01, release: 0.5 }))
      break
    case 'blip': {
      // Pip's chatter: a tiny pitched chirp per syllable, Animalese-style.
      tone(c, t, { type: 'square', from: 520 + strength * 260, to: 460 + strength * 240, peak: 0.022, attack: 0.004, release: 0.05 })
      break
    }
    case 'gong':
      for (const [f, peak] of [
        [110, 0.18],
        [221, 0.1],
        [347, 0.06],
        [521, 0.04],
      ] as const)
        tone(c, t, { type: 'sine', from: f, to: f * 0.985, peak, attack: 0.008, release: 2.6 })
      break
    case 'wave':
      ;[659, 784].forEach((f, i) => tone(c, t + i * 0.1, { type: 'sine', from: f, peak: 0.07, attack: 0.01, release: 0.16 }))
      break
  }
}
