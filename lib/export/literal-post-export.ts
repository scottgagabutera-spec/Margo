import { captureLiteralUi } from '@/lib/export/literal-ui-capture'
import { shareImageBlob, type ShareImageResult } from '@/lib/export/share-image-blob'

const SITE_ORIGIN = 'https://trymargo.com'

export function getPostShareUrl(postId: string): string {
  return `${SITE_ORIGIN}/post/${postId}`
}

/**
 * Literal UI export for a live PostCard root element.
 * Experiment: captures the visible React card, not CardExportModal poster art.
 */
export async function literalExportPostCard(postId: string): Promise<ShareImageResult | 'not-found'> {
  const el = document.querySelector(`[data-margo-post-export="${postId}"]`)
  if (!el || !(el instanceof HTMLElement)) return 'not-found'

  const blob = await captureLiteralUi(el)
  return shareImageBlob(blob, {
    filename: `margo-post-${postId}.png`,
    title: 'Margo',
    url: getPostShareUrl(postId),
  })
}
