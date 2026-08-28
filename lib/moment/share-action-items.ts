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
  linksActive: boolean
  onShareImage: () => void
  onShareVideo?: () => void
  onShareGif?: () => void
  onShareLink: () => void
  onCopyLink: () => void
  /** When false, link/copy rows are omitted (not shown disabled). */
  showPendingLinks?: boolean
  pendingHint?: string
}

/**
 * Shared Share ▾ menu items for Stage + Card modal.
 * Export file shares only (image / video / GIF) — no link rows for now.
 */
export function buildMomentShareActionItems({
  canShareImage,
  canShareVideo = false,
  canShareGif = false,
  linksActive,
  onShareImage,
  onShareVideo = () => {},
  onShareGif = () => {},
  onShareLink,
  onCopyLink,
  showPendingLinks = false,
  pendingHint = 'Post to Margo first',
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

  if (linksActive) {
    items.push({ id: 'link', label: 'Share link', onClick: onShareLink })
    items.push({ id: 'copy', label: 'Copy link', onClick: onCopyLink })
  } else if (showPendingLinks) {
    items.push({
      id: 'link-wait',
      label: 'Share link',
      hint: pendingHint,
      disabled: true,
      onClick: () => {},
    })
    items.push({
      id: 'copy-wait',
      label: 'Copy link',
      hint: pendingHint,
      disabled: true,
      onClick: () => {},
    })
  }

  return items
}
