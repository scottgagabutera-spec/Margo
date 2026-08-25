import type { MomentActionMenuItem } from '@/components/moment-action-menu'

export interface BuildMomentExportActionItemsInput {
  onExportImage: () => void
  /** When false, only Image (e.g. lyric-back dual card). */
  showFormats?: boolean
  hasPlayableSnippet?: boolean
  onExportGif?: () => void
}

/** Export ▾ submenu: Image / PDF / GIF — shared by Stage + Card modal. */
export function buildMomentExportActionItems({
  onExportImage,
  showFormats = true,
  hasPlayableSnippet = false,
  onExportGif = () => {},
}: BuildMomentExportActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = [
    { id: 'png', label: 'Image', onClick: onExportImage },
  ]
  if (!showFormats) return items
  items.push(
    { id: 'pdf', label: 'PDF', hint: 'Coming soon', disabled: true, onClick: () => {} },
    {
      id: 'gif',
      label: 'GIF',
      ...(hasPlayableSnippet ? {} : { hint: 'Needs a playable snippet', disabled: true }),
      onClick: onExportGif,
    },
  )
  return items
}

export interface BuildMomentShareActionItemsInput {
  canShareImage: boolean
  linksActive: boolean
  onShareImage: () => void
  onShareLink: () => void
  onCopyLink: () => void
  /** When false, link/copy rows are omitted (not shown disabled). */
  showPendingLinks?: boolean
  pendingHint?: string
}

/**
 * Shared Share ▾ menu items for Stage + Card modal.
 * Pre-publish: image only. Post-publish: image + link + copy.
 */
export function buildMomentShareActionItems({
  canShareImage,
  linksActive,
  onShareImage,
  onShareLink,
  onCopyLink,
  showPendingLinks = false,
  pendingHint = 'Post to Margo first',
}: BuildMomentShareActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = []

  if (canShareImage) {
    items.push({ id: 'img', label: 'Share image', onClick: onShareImage })
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
