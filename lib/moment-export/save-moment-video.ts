import type { MargoMoment } from '@/lib/moment/types'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import { shareMomentFile, type ShareMomentFileResult } from '@/lib/moment/file-share'
import {
  getCachedMomentVideo,
  setCachedMomentVideo,
} from '@/lib/moment-export/video/moment-video-cache'

export type ShareMomentVideoResult = 'shared' | 'failed' | 'cancelled' | 'preview'

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
): Promise<MomentVideoFileResult | null> {
  return getOrCreateMomentVideoFile(moment, onProgress, signal)
}

/** Returns preview URL for share sheet — caller shows playable preview before sharing. */
export async function prepareMargoMomentVideoShare(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<MomentVideoFileResult | null> {
  return getOrCreateMomentVideoFile(moment, onProgress, signal)
}

export async function sharePreparedMomentVideo(
  file: File,
  moment: MargoMoment,
): Promise<ShareMomentVideoResult> {
  const result: ShareMomentFileResult = await shareMomentFile(file, moment)
  if (result === 'shared') return 'shared'
  if (result === 'cancelled') return 'cancelled'
  return 'failed'
}

export { canShareVideoFiles } from '@/lib/moment-export/video/capabilities'
