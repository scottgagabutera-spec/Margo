import type { MomentActionMenuItem } from '@/components/moment-action-menu'
import {
  MOMENT_CLIP_EXPORT_HINT,
  MOMENT_VISUAL_LOOP_LABEL,
} from '@/lib/moment-export/export-hints'

export interface BuildMomentExportActionItemsInput {
  onExportImage: () => void
  hasPlayableSnippet?: boolean
  hasVisualLoopExport?: boolean
  canExportVideo?: boolean
  videoUnavailableHint?: string
  onExportVideo?: () => void
}

/** Export ▾ submenu: Image / Video / PDF — shared by Stage + Card modal. */
export function buildMomentExportActionItems({
  onExportImage,
  hasPlayableSnippet = false,
  hasVisualLoopExport = false,
  canExportVideo = false,
  videoUnavailableHint = 'Not available on this device',
  onExportVideo = () => {},
}: BuildMomentExportActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = [
    { id: 'png', label: 'Image', onClick: onExportImage },
  ]

  const canClipExport = hasPlayableSnippet || hasVisualLoopExport
  const videoEnabled = canClipExport && canExportVideo
  let videoHint: string | undefined
  if (videoEnabled && hasVisualLoopExport && !hasPlayableSnippet) {
    videoHint = MOMENT_VISUAL_LOOP_LABEL
  } else if (!canClipExport) {
    videoHint = MOMENT_CLIP_EXPORT_HINT
  } else if (!canExportVideo) {
    videoHint = videoUnavailableHint
  }

  items.push(
    {
      id: 'video',
      label: 'Video',
      ...(videoEnabled ? { hint: videoHint } : { hint: videoHint, disabled: true }),
      onClick: onExportVideo,
    },
    { id: 'pdf', label: 'PDF', hint: 'Coming soon', disabled: true, onClick: () => {} },
  )
  return items
}

export interface BuildMomentShareActionItemsInput {
  canShareImage: boolean
  canShareVideo?: boolean
  onShareImage: () => void
  onShareVideo?: () => void
}

/**
 * Shared Share ▾ menu items for Stage + Card modal.
 * Image / Video only — link sharing is not available yet.
 */
export function buildMomentShareActionItems({
  canShareImage,
  canShareVideo = false,
  onShareImage,
  onShareVideo = () => {},
}: BuildMomentShareActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = []

  if (canShareImage) {
    items.push({ id: 'img', label: 'Share image', onClick: onShareImage })
  }

  if (canShareVideo) {
    items.push({ id: 'vid', label: 'Share video', onClick: onShareVideo })
  }

  return items
}
