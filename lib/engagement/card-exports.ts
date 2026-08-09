/**
 * Margo Engagement — card export analytics
 *
 * Fire-and-forget insert into card_exports after a successful PNG download
 * from CardExportModal. Soft-fails when unauthenticated or on network error;
 * never throws to UI and must never block the download.
 */

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type RecordCardExportArgs = {
  postId?: string | null
  theme: string
  shape: string
}

/**
 * Soft-fail record of a card export. Safe to void-call after a.click().
 */
export async function recordCardExport({
  postId,
  theme,
  shape,
}: RecordCardExportArgs): Promise<void> {
  if (!theme || !shape) return

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.id) return

    const { error } = await supabase.from('card_exports').insert({
      user_id: user.id,
      post_id: postId ?? null,
      theme,
      shape,
    })
    if (error) {
      console.error('[recordCardExport] insert failed:', error.message, {
        code: error.code,
      })
    }
  } catch (e) {
    console.error('[recordCardExport] unexpected error:', e)
  }
}
