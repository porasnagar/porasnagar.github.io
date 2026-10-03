import type { RecordEntry } from '../content/records'

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

function seeded(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Engine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private tone!: BiquadFilterNode
  private sfx!: GainNode
  private analyser!: AnalyserNode
  private noise!: AudioBuffer
  private crackleGain!: GainNode
  private timer: number | null = null
  private music: RecordEntry['music'] | null = null
  private rand: () => number = Math.random
  private step = 0
  private nextTime = 0
  private rate = 1
  private enabled = true
  private volume = 0.7
  private buf = new Float32Array(1024)

  private ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.enabled ? this.volume : 0
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.master.connect(this.analyser)
    this.analyser.connect(ctx.destination)

    this.tone = ctx.createBiquadFilter()
    this.tone.type = 'lowpass'
    this.tone.frequency.value = 3200
    this.tone.Q.value = 0.4
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(this.tone)
    this.tone.connect(this.master)

    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.9
    this.sfx.connect(this.master)

    const len = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1

    const crackleBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
    const c = crackleBuf.getChannelData(0)
    for (let i = 0; i < c.length; i++) {
      const pop = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0
      c[i] = pop + (Math.random() * 2 - 1) * 0.018
    }
    this.crackleGain = ctx.createGain()
    this.crackleGain.gain.value = 0
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 900
    this.crackleGain.connect(hp)
    hp.connect(this.master)
    const src = ctx.createBufferSource()
    src.buffer = crackleBuf
    src.loop = true
    src.connect(this.crackleGain)
    src.start()
    return ctx
  }

  unlock() {
    this.ensure()
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.05)
  }

  setVolume(v: number) {
    this.volume = v
    if (!this.ctx || !this.enabled) return
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  private burst(t: number, dur: number, freq: number, type: BiquadFilterType, gain: number, out: AudioNode) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(out)
    s.start(t, Math.random() * 1.5)
    s.stop(t + dur + 0.02)
  }

  private blip(t: number, f0: number, f1: number, dur: number, gain: number, out: AudioNode, type: OscillatorType = 'sine') {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  click(kind: 'button' | 'knob' | 'sleeve' | 'lid' = 'button') {
    const ctx = this.ensure()
    const t = ctx.currentTime
    if (kind === 'button') {
      this.burst(t, 0.03, 3200, 'bandpass', 0.5, this.sfx)
      this.blip(t, 1800, 900, 0.025, 0.08, this.sfx, 'square')
    } else if (kind === 'knob') {
      this.burst(t, 0.018, 5200, 'bandpass', 0.35, this.sfx)
    } else if (kind === 'sleeve') {
      this.burst(t, 0.22, 1600, 'bandpass', 0.12, this.sfx)
    } else {
      this.burst(t, 0.12, 600, 'lowpass', 0.4, this.sfx)
      this.blip(t, 180, 90, 0.1, 0.15, this.sfx)
    }
  }

  thump() {
    const ctx = this.ensure()
    const t = ctx.currentTime
    this.blip(t, 120, 45, 0.18, 0.5, this.sfx)
    this.burst(t, 0.06, 2400, 'bandpass', 0.3, this.sfx)
  }

  play(music: RecordEntry['music'], id: string, speed: 33 | 45) {
    const ctx = this.ensure()
    this.music = music
    this.rand = seeded(id)
    this.step = 0
    this.rate = speed === 45 ? 45 / 33.33 : 1
    this.nextTime = ctx.currentTime + 0.15
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime)
    this.musicBus.gain.setTargetAtTime(1, ctx.currentTime, 0.3)
    this.crackleGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2)
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 40)
  }

  setSpeed(speed: 33 | 45) {
    this.rate = speed === 45 ? 45 / 33.33 : 1
  }

  stop(spinDown = true) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.musicBus.gain.cancelScheduledValues(t)
    this.musicBus.gain.setTargetAtTime(0, t, spinDown ? 0.25 : 0.05)
    this.crackleGain.gain.setTargetAtTime(0, t, 0.15)
    const stopAt = spinDown ? 900 : 120
    window.setTimeout(() => {
      if (this.timer !== null && this.musicBus.gain.value < 0.05) {
        clearInterval(this.timer)
        this.timer = null
        this.music = null
      }
    }, stopAt)
  }

  level() {
    if (!this.ctx) return 0
    this.analyser.getFloatTimeDomainData(this.buf)
    let sum = 0
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i]
    return Math.sqrt(sum / this.buf.length)
  }

  private schedule() {
    const ctx = this.ctx
    const m = this.music
    if (!ctx || !m) return
    const semis = this.rate > 1 ? 5 : 0
    const sixteenth = 60 / (m.bpm * this.rate) / 4
    while (this.nextTime < ctx.currentTime + 0.25) {
      this.note(this.step, this.nextTime, m, semis, sixteenth)
      const swing = this.step % 2 === 0 ? 1.12 : 0.88
      this.nextTime += sixteenth * swing
      this.step++
    }
  }

  private note(step: number, t: number, m: RecordEntry['music'], semis: number, sixteenth: number) {
    const ctx = this.ctx!
    const scale = SCALES[m.mode]
    const bar = Math.floor(step / 16)
    const s = step % 16
    const degree = m.prog[bar % m.prog.length]
    const deg = (d: number) => m.root + semis + scale[d % 7] + 12 * Math.floor(d / 7)
    const out = this.musicBus

    if (s === 0) {
      const chord = [degree, degree + 2, degree + 4, degree + 6].map(deg)
      const len = sixteenth * 16
      chord.forEach((n, i) => {
        for (const det of [-6, 5]) {
          const o = ctx.createOscillator()
          o.type = i === 0 ? 'triangle' : 'sine'
          o.frequency.value = hz(n)
          o.detune.value = det
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(0.028, t + 0.25)
          g.gain.setTargetAtTime(0.0001, t + len - 0.2, 0.25)
          o.connect(g).connect(out)
          o.start(t)
          o.stop(t + len + 1)
        }
      })
    }

    if (s === 0 || s === 10) {
      const n = deg(degree) - 24
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz(n)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + sixteenth * 5)
      o.connect(g).connect(out)
      o.start(t)
      o.stop(t + sixteenth * 6)
    }

    if (s === 0 || s === 8 || (s === 7 && this.rand() < 0.35)) this.blip(t, 140, 42, 0.32, 0.55, out)
    if (s === 4 || s === 12) this.burst(t, 0.16, 1800, 'bandpass', 0.22, out)
    if (s % 2 === 0) this.burst(t, 0.035, 7500, 'highpass', s % 4 === 2 ? 0.07 : 0.04, out)

    if (s % 2 === 0 && this.rand() < 0.3) {
      const pent = [0, 1, 2, 4, 5]
      const d = degree + 7 + pent[Math.floor(this.rand() * pent.length)]
      const f = hz(deg(d))
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const mod = ctx.createOscillator()
      mod.frequency.value = f * 2
      const modGain = ctx.createGain()
      modGain.gain.setValueAtTime(f * 0.6, t)
      modGain.gain.exponentialRampToValueAtTime(1, t + 0.4)
      mod.connect(modGain).connect(o.frequency)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.connect(g).connect(out)
      o.start(t)
      mod.start(t)
      o.stop(t + 1)
      mod.stop(t + 1)
    }
  }
}

export const audio = new Engine()
