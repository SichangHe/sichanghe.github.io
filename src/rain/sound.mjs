// 🧑 "should be more varied like a milder rain, have individual drip sounds, dropping onto concrete/leaves/ponds, etc."
export function makeRain() {
  /** Generate two minutes of scattered surface impacts over a quiet stereo rain bed. */
  const rate = 24000;
  const frames = rate * 120;
  const overlap = rate * 4;
  const channels = [];
  let peak = 0;
  let seed = 0x72a14f39;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  for (let channel = 0; channel < 2; channel++) {
    const samples = new Float32Array(frames + overlap);
    let low = 0, mid = 0, dc = 0;
    for (let i = 0; i < samples.length; i++) {
      const noise = random() * 2 - 1;
      low += 0.07 * (noise - low);
      mid += 0.36 * (noise - mid);
      dc += 0.012 * (noise - dc);
      const time = i / rate;
      const swell = 1 + 0.12 * Math.sin(2 * Math.PI * time / 40)
        + 0.08 * Math.sin(2 * Math.PI * time / 24 + channel * 0.4);
      samples[i] = (0.65 * low + 0.35 * mid - dc) * 0.035 * swell;
    }
    channels.push(samples);
  }
  const surfaces = [
    {density: 12, decay: 0.009, cutoff: 0.55, tone: 0, frequency: 1800, level: 0.18, pan: -0.3},
    {density: 18, decay: 0.022, cutoff: 0.26, tone: 0.06, frequency: 650, level: 0.14, pan: 0.3},
    {density: 4, decay: 0.028, cutoff: 0.32, tone: 0.32, frequency: 1150, level: 0.15, pan: 0},
  ];
  for (const surface of surfaces) {
    let time = 0;
    while (time < (frames + overlap) / rate) {
      const density = surface.density * (1 + 0.25 * Math.sin(time * 2 * Math.PI / 30));
      time += -Math.log(1 - random()) / density;
      const start = Math.floor(time * rate);
      const decay = surface.decay * (0.65 + random() * 0.9);
      const length = Math.ceil(decay * 8 * rate);
      const level = surface.level * (0.25 + 0.75 * random() ** 2);
      const frequency = surface.frequency * (0.7 + random() * 0.6);
      const pan = Math.max(-0.85, Math.min(0.85, surface.pan + (random() - 0.5) * 1.3));
      const gains = [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
      const delays = [pan > 0 ? Math.round(pan * rate * 0.0004) : 0,
        pan < 0 ? Math.round(-pan * rate * 0.0004) : 0];
      let filtered = 0, slow = 0, phase = random() * Math.PI * 2;
      for (let i = 0; i < length; i++) {
        const seconds = i / rate;
        const envelope = (1 - Math.exp(-seconds / 0.0015)) * Math.exp(-seconds / decay);
        filtered += surface.cutoff * ((random() * 2 - 1) - filtered);
        slow += 0.045 * (filtered - slow);
        phase += 2 * Math.PI * frequency * (1 + 0.35 * (1 - Math.exp(-seconds / 0.018))) / rate;
        const impact = level * envelope * (filtered - slow
          + surface.tone * Math.sin(phase) * Math.exp(-seconds / 0.025));
        for (let channel = 0; channel < 2; channel++) {
          const index = start + i + delays[channel];
          if (index < channels[channel].length) channels[channel][index] += impact * gains[channel];
        }
      }
    }
  }
  for (const samples of channels) {
    for (let i = 0; i < overlap; i++) {
      const angle = (i / overlap) * Math.PI / 2;
      samples[i] = samples[frames + i] * Math.cos(angle) + samples[i] * Math.sin(angle);
    }
    for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(samples[i]));
  }
  const bytes = new Uint8Array(44 + frames * 4);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVEfmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames; i++) {
    for (let channel = 0; channel < 2; channel++) {
      const normalized = channels[channel][i] * (10 ** (-1 / 20)) / peak;
      view.setInt16(44 + i * 4 + channel * 2, Math.round(normalized * 32767), true);
    }
  }
  return bytes;
}
