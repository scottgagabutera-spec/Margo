import { toast } from 'sonner'
import type { FileDownloadResult } from '@/lib/moment-export/trigger-file-download'

export function toastMomentImageSaved(): void {
  toast.success('Moment saved.')
}

export function toastMomentVideoSaved(result: FileDownloadResult): void {
  if (result === 'shared') {
    toast.success('Tap Save to Files to keep your video.')
    return
  }
  if (result === 'opened') {
    toast.success('Video opened — save it from your browser.')
    return
  }
  if (result === 'downloaded') {
    toast.success('Video saved.')
    return
  }
  toast.error("Couldn't save your video. Try again.")
}

export function toastMomentShared(): void {
  toast.success('Shared.')
}

export function toastMomentLinkCopied(): void {
  toast.success('Link copied.')
}

export function toastMomentExportFailed(kind: 'image' | 'video'): void {
  toast.error(
    kind === 'video'
      ? "Couldn't create your video. Try saving an image instead."
      : "Couldn't save your Moment. Try again.",
  )
}

export function toastMomentShareFailed(): void {
  toast.error("Couldn't share right now. Try again.")
}
