import type { MargoMoment } from '@/lib/moment/types'
import { slugify } from '@/lib/moment-export/save-moment-image'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import { canShareVideoFiles } from '@/lib/moment-export/video/capabilities'

export type ShareMomentVideoResult = 'shared' | 'failed'

function videoFilename(moment: MargoMoment): string {
  const primary = moment.lines[0]
  const base = slugify(primary?.songTitle || '', 'Lyric')
  return `MARGO_${base}_Moment.mp4`
}

export async function renderMargoMomentMp4File(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<File | null> {
  if (typeof document === 'undefined' || !momentHasPlayableSnippet(moment)) return null
  const { encodeMargoMomentMp4 } = await import('@/lib/moment-export/video/encode-moment-mp4')
  const result = await encodeMargoMomentMp4(moment, (p) => {
    if (p.phase === 'audio') onProgress?.('Loading audio…')
    else if (p.phase === 'frames' && p.frameCount) {
      onProgress?.(`Creating your Moment… ${Math.round(((p.frame ?? 0) / p.frameCount) * 100)}%`)
    } else if (p.phase === 'finalize') onProgress?.('Finishing…')
    else onProgress?.('Creating your Moment…')
  }, signal)
  return new File([result.blob], videoFilename(moment), { type: 'video/mp4' })
}

export async function downloadMargoMomentVideo(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const file = await renderMargoMomentMp4File(moment, onProgress, signal)
  if (!file) return
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function shareMargoMomentVideo(
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<ShareMomentVideoResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'
  const file = await renderMargoMomentMp4File(moment, onProgress, signal)
  if (!file) return 'failed'
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
