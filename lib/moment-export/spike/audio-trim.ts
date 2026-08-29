/** Trim an AudioBuffer to [startSec, endSec] relative to the buffer's t=0. */

export function trimAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): AudioBuffer {
  const sampleRate = buffer.sampleRate
  const startSample = Math.max(0, Math.floor(startSec * sampleRate))
  const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate))
  const length = Math.max(0, endSample - startSample)
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, length, sampleRate)

  const out = ctx.createBuffer(buffer.numberOfChannels, length, sampleRate)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch)
    out.getChannelData(ch).set(src.subarray(startSample, endSample))
  }
  return out
}

export async function fetchAndDecodeAudioSnippet(
  url: string,
  startSec: number,
  endSec: number,
): Promise<AudioBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`)
  const raw = await res.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(raw.slice(0))
    return trimAudioBuffer(decoded, startSec, endSec)
  } finally {
    await ctx.close()
  }
}
