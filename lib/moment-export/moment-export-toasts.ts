import { toast } from 'sonner'
import type { FileDownloadResult } from '@/lib/moment-export/trigger-file-download'

function quietToast(message: string) {
  toast(message, { duration: 2400 })
}

export function toastMomentPosted(): void {
  quietToast('Posted')
}

export function toastMomentPrivate(): void {
  quietToast('Saved')
}

export function toastMomentSent(name?: string | null): void {
  quietToast(name ? `Sent to ${name}` : 'Sent')
}

export function toastMomentImageSaved(): void {
  quietToast('Saved')
}

export function toastMomentVideoSaved(result: FileDownloadResult): void {
  if (result === 'shared') {
    quietToast('Save from the share sheet')
    return
  }
  if (result === 'opened') {
    quietToast('Opened — save from the browser')
    return
  }
  if (result === 'downloaded') {
    quietToast('Saved')
    return
  }
  toast.error("Couldn't save your video. Try again.")
}

export function toastMomentGifSaved(result: FileDownloadResult): void {
  if (result === 'shared') {
    quietToast('Save from the share sheet')
    return
  }
  if (result === 'opened') {
    quietToast('Opened — save from the browser')
    return
  }
  if (result === 'downloaded') {
    quietToast('Saved')
    return
  }
  toast.error("Couldn't save your GIF. Try again.")
}

export function toastMomentShared(): void {
  quietToast('Shared')
}

export function toastMomentLinkCopied(): void {
  quietToast('Copied')
}

export function toastMomentExportFailed(kind: 'image' | 'video' | 'gif', detail?: string): void {
  if (kind === 'video' && detail?.includes('audio')) {
    toast.error("Couldn't load audio for this Moment. Try again in a moment.")
    return
  }
  toast.error(
    kind === 'video'
      ? "Couldn't create your video. Try saving an image instead."
      : kind === 'gif'
        ? "Couldn't create your GIF. Try saving an image instead."
        : "Couldn't save your Moment. Try again.",
  )
}

export function toastMomentShareFailed(): void {
  toast.error("Couldn't share right now. Try again.")
}
