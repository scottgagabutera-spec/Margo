import type { MomentActionMenuItem } from '@/components/moment-action-menu'

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
 * Shared Save/Share menu items for Stage + Card modal.
 * Pre-publish: image only. Post-publish: image + link + copy.
 */
export function buildMomentShareActionItems({
  canShareImage,
  linksActive,
  onShareImage,
  onShareLink,
  onCopyLink,
  showPendingLinks = false,
  pendingHint = 'Send to Margo first',
}: BuildMomentShareActionItemsInput): MomentActionMenuItem[] {
  const items: MomentActionMenuItem[] = []

  if (canShareImage) {
    items.push({ id: 'img', label: 'Share image', onClick: onShareImage })
  }

  if (linksActive) {
    items.push({
      id: 'link',
      label: 'Share link',
      hint: 'Lyric preview — not a raw URL',
      onClick: onShareLink,
    })
    items.push({
      id: 'copy',
      label: 'Copy link',
      hint: 'Beautiful text for paste',
      onClick: onCopyLink,
    })
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
