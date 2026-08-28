import type { MomentActionMenuItem } from '@/components/moment-action-menu'
import { MOMENT_CLIP_EXPORT_HINT } from '@/lib/moment-export/export-hints'

export interface BuildMomentExportActionItemsInput {
  onExportImage: () => void
  /** When false, only Image (e.g. lyric-back dual card). */
  showFormats?: boolean
  hasPlayableSnippet?: boolean
  canExportVideo?: boolean
  videoUnavailableHint?: string
  onExportVideo?: () => void
  canExportGif?: boolean
  gifUnavailableHint?: string
  onExportGif?: () => void
}

/** Export ▾ submenu: Image / Video / GIF / PDF — shared by Stage + Card modal. */
export function buildMomentExportActionItems({
  onExportImage,
  showFormats = true,
  hasPlayableSnippet = false,
  canExportVideo = false,
  videoUnavailableHint = 'Not available on this device',
  onExportVideo = () => {},
  canExportGif = false,
  gifUnavailableHint = 'Not available on this device',
  onExportGif = () => {},
}: BuildMomentExportActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = [
    { id: 'png', label: 'Image', onClick: onExportImage },
  ]
  if (!showFormats) return items

  const videoEnabled = hasPlayableSnippet && canExportVideo
  let videoHint: string | undefined
  if (!hasPlayableSnippet) {
    videoHint = MOMENT_CLIP_EXPORT_HINT
  } else if (!canExportVideo) {
    videoHint = videoUnavailableHint
  }

  const gifEnabled = hasPlayableSnippet && canExportGif
  let gifHint: string | undefined
  if (!hasPlayableSnippet) {
    gifHint = MOMENT_CLIP_EXPORT_HINT
  } else if (!canExportGif) {
    gifHint = gifUnavailableHint
  }

  items.push(
    {
      id: 'video',
      label: 'Video',
      ...(videoEnabled ? {} : { hint: videoHint, disabled: true }),
      onClick: onExportVideo,
    },
    {
      id: 'gif',
      label: 'GIF',
      ...(gifEnabled ? {} : { hint: gifHint, disabled: true }),
      onClick: onExportGif,
    },
    { id: 'pdf', label: 'PDF', hint: 'Coming soon', disabled: true, onClick: () => {} },
  )
  return items
}

export interface BuildMomentShareActionItemsInput {
  canShareImage: boolean
  canShareVideo?: boolean
  canShareGif?: boolean
  onShareImage: () => void
  onShareVideo?: () => void
  onShareGif?: () => void
}

/**
 * Shared Share ▾ menu items for Stage + Card modal.
 * Image / Video / GIF only — link sharing is not available yet.
 */
export function buildMomentShareActionItems({
  canShareImage,
  canShareVideo = false,
  canShareGif = false,
  onShareImage,
  onShareVideo = () => {},
  onShareGif = () => {},
}: BuildMomentShareActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = []

  if (canShareImage) {
    items.push({ id: 'img', label: 'Share image', onClick: onShareImage })
  }

  if (canShareVideo) {
    items.push({ id: 'vid', label: 'Share video', onClick: onShareVideo })
  }

  if (canShareGif) {
    items.push({ id: 'gif', label: 'Share GIF', onClick: onShareGif })
  }

  return items
}
