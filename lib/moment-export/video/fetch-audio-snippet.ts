export function trimAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): AudioBuffer {
  const sampleRate = buffer.sampleRate
  const startSample = Math.max(0, Math.floor(startSec * sampleRate))
  const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate))
  const length = Math.max(0, endSample - startSample)
  const out = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length,
    sampleRate,
  })
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).subarray(startSample, endSample), ch)
  }
  return out
}

const RANGE_BYTES_PER_SEC = 20_000

async function fetchAudioArrayBuffer(
  fetchUrl: string,
  startSec: number,
  endSec: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const padSec = 1.5
  const rangeStart = Math.max(0, Math.floor((startSec - padSec) * RANGE_BYTES_PER_SEC))
  const rangeEnd = Math.ceil((endSec + padSec) * RANGE_BYTES_PER_SEC)
  const rangeHeader = `bytes=${rangeStart}-${rangeEnd}`
  let res = await fetch(fetchUrl, { signal, headers: { Range: rangeHeader } })
  if (res.status === 416 || res.status === 404) {
    res = await fetch(fetchUrl, { signal })
  }
  if (!res.ok && res.status !== 206) {
    throw new Error(`Could not load audio for video export (${res.status})`)
  }
  return res.arrayBuffer()
}

export async function fetchAndDecodeAudioSnippet(
  audioUrl: string,
  startSec: number,
  endSec: number,
  signal?: AbortSignal,
): Promise<AudioBuffer> {
  const { resolveExportMediaFetchUrl } = await import('@/lib/moment-export/video/resolve-export-media-url')
  const fetchUrl = resolveExportMediaFetchUrl(audioUrl)
  let raw: ArrayBuffer
  try {
    raw = await fetchAudioArrayBuffer(fetchUrl, startSec, endSec, signal)
  } catch (err) {
    const msg = (err as Error)?.message || 'Network error'
    throw new Error(`Could not load audio for video export (${msg})`)
  }
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(raw.slice(0))
    return trimAudioBuffer(decoded, startSec, endSec)
  } finally {
    await ctx.close()
  }
}

export function truncateAudioBuffer(buffer: AudioBuffer, maxDurationSec: number): AudioBuffer {
  const maxSamples = Math.min(buffer.length, Math.ceil(maxDurationSec * buffer.sampleRate))
  if (maxSamples >= buffer.length) return buffer
  const out = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: maxSamples,
    sampleRate: buffer.sampleRate,
  })
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).subarray(0, maxSamples), ch)
  }
  return out
}

export function prependSilence(buffer: AudioBuffer, durationSec: number): AudioBuffer {
  const sampleRate = buffer.sampleRate
  const padSamples = Math.max(0, Math.round(durationSec * sampleRate))
  if (padSamples === 0) return buffer
  const out = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: padSamples + buffer.length,
    sampleRate,
  })
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const padded = new Float32Array(out.length)
    padded.set(buffer.getChannelData(ch), padSamples)
    out.copyToChannel(padded, ch)
  }
  return out
}
