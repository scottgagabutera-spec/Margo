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

export async function fetchAndDecodeAudioSnippet(
  audioUrl: string,
  startSec: number,
  endSec: number,
  signal?: AbortSignal,
): Promise<AudioBuffer> {
  const { resolveExportMediaFetchUrl } = await import('@/lib/moment-export/video/resolve-export-media-url')
  const fetchUrl = resolveExportMediaFetchUrl(audioUrl)
  let res: Response
  try {
    res = await fetch(fetchUrl, { signal })
  } catch (err) {
    const msg = (err as Error)?.message || 'Network error'
    throw new Error(`Could not load audio for video export (${msg})`)
  }
  if (!res.ok) throw new Error(`Could not load audio for video export (${res.status})`)
  const raw = await res.arrayBuffer()
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
