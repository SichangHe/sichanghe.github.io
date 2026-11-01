export function makeRain() {
  /** Generate a quiet two-minute stereo WAV with a four-second overlap at the seam. */
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
    let low = 0, mid = 0, high = 0, dc = 0, drop = 0, dropSmooth = 0;
    for (let i = 0; i < samples.length; i++) {
      const noise = random() * 2 - 1;
      low += 0.07 * (noise - low);
      mid += 0.36 * (noise - mid);
      high += 0.78 * (noise - high);
      dc += 0.012 * (noise - dc);
      if (random() < 0.006) drop += (random() - 0.5) * 0.45;
      drop *= 0.982;
      dropSmooth += 0.19 * (drop - dropSmooth);
      const time = i / rate;
      const swell = 1 + 0.065 * Math.sin(2 * Math.PI * time / 40)
        + 0.035 * Math.sin(2 * Math.PI * time / 24 + channel * 0.4);
      samples[i] = ((0.55 * low + 0.36 * mid + 0.09 * high - dc)
        + dropSmooth * 0.35) * swell;
    }
    for (let i = 0; i < overlap; i++) {
      const angle = (i / overlap) * Math.PI / 2;
      samples[i] = samples[frames + i] * Math.cos(angle) + samples[i] * Math.sin(angle);
    }
    for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(samples[i]));
    channels.push(samples);
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
