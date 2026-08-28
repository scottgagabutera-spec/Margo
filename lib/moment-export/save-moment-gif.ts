import type { MargoMoment } from '@/lib/moment/types'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import {
  getCachedMomentGif,
  setCachedMomentGif,
} from '@/lib/moment-export/gif/moment-gif-cache'

export type ShareMomentGifResult = 'shared' | 'failed' | 'cancelled'

export interface MomentGifFileResult {
  file: File
  previewUrl: string
  fromCache: boolean
}

function progressMessage(
  p: { phase: string; frame?: number; frameCount?: number },
): string {
  if (p.phase === 'frames' && p.frameCount) {
    return `Creating your Moment… ${Math.round(((p.frame ?? 0) / p.frameCount) * 100)}%`
  }
  if (p.phase === 'finalize') return 'Finishing…'
  return 'Creating your Moment…'
}

export async function getOrCreateMomentGifFile(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<MomentGifFileResult | null> {
  if (typeof document === 'undefined' || !momentHasPlayableSnippet(moment)) return null

  const cached = getCachedMomentGif(moment)
  if (cached) {
    onProgress?.('Ready')
    return { file: cached.file, previewUrl: cached.previewUrl, fromCache: true }
  }

  const { encodeMargoMomentGif } = await import('@/lib/moment-export/gif/encode-moment-gif')
  const result = await encodeMargoMomentGif(moment, (p) => {
    onProgress?.(progressMessage(p))
  }, signal)
  const entry = setCachedMomentGif(moment, result)
  return { file: entry.file, previewUrl: entry.previewUrl, fromCache: false }
}

export async function downloadMargoMomentGif(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<MomentGifFileResult | null> {
  return getOrCreateMomentGifFile(moment, onProgress, signal)
}

export async function prepareMargoMomentGifShare(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<MomentGifFileResult | null> {
  return getOrCreateMomentGifFile(moment, onProgress, signal)
}

export async function sharePreparedMomentGif(file: File): Promise<ShareMomentGifResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'
  if (typeof navigator.canShare === 'function') {
    try {
      if (!navigator.canShare({ files: [file] })) return 'failed'
    } catch {
      /* Some Android builds reject canShare probes — still try share below */
    }
  }
  try {
    await navigator.share({ files: [file], title: 'MARGO Moment' })
    return 'shared'
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'cancelled'
    return 'failed'
  }
}

export { canShareGifFiles } from '@/lib/moment-export/gif/capabilities'
