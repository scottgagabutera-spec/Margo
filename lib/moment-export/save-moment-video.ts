import type { MargoMoment } from '@/lib/moment/types'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import { canShareVideoFiles } from '@/lib/moment-export/video/capabilities'
import {
  getCachedMomentVideo,
  setCachedMomentVideo,
} from '@/lib/moment-export/video/moment-video-cache'

export type ShareMomentVideoResult = 'shared' | 'failed' | 'preview'

export interface MomentVideoFileResult {
  file: File
  previewUrl: string
  fromCache: boolean
}

function progressMessage(
  p: { phase: string; frame?: number; frameCount?: number },
): string {
  if (p.phase === 'audio') return 'Loading audio…'
  if (p.phase === 'frames' && p.frameCount) {
    return `Creating your Moment… ${Math.round(((p.frame ?? 0) / p.frameCount) * 100)}%`
  }
  if (p.phase === 'finalize') return 'Finishing…'
  return 'Creating your Moment…'
}

export async function getOrCreateMomentVideoFile(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<MomentVideoFileResult | null> {
  if (typeof document === 'undefined' || !momentHasPlayableSnippet(moment)) return null

  const cached = getCachedMomentVideo(moment)
  if (cached) {
    onProgress?.('Ready')
    return { file: cached.file, previewUrl: cached.previewUrl, fromCache: true }
  }

  const { encodeMargoMomentMp4 } = await import('@/lib/moment-export/video/encode-moment-mp4')
  const result = await encodeMargoMomentMp4(moment, (p) => {
    onProgress?.(progressMessage(p))
  }, signal)
  const entry = setCachedMomentVideo(moment, result)
  return { file: entry.file, previewUrl: entry.previewUrl, fromCache: false }
}

export async function downloadMargoMomentVideo(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const out = await getOrCreateMomentVideoFile(moment, onProgress, signal)
  if (!out) return
  const url = URL.createObjectURL(out.file)
  const a = document.createElement('a')
  a.href = url
  a.download = out.file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Returns preview URL for share sheet — caller shows playable preview before sharing. */
export async function prepareMargoMomentVideoShare(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<MomentVideoFileResult | null> {
  return getOrCreateMomentVideoFile(moment, onProgress, signal)
}

export async function sharePreparedMomentVideo(file: File): Promise<ShareMomentVideoResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'
  if (!canShareVideoFiles()) return 'failed'
  try {
    await navigator.share({ files: [file], title: 'MARGO Moment' })
    return 'shared'
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'failed'
    return 'failed'
  }
}

export { canShareVideoFiles }
