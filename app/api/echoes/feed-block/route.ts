import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadEchoFeedBlock } from '@/lib/echoes/load-active'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const snapshot = await loadEchoFeedBlock(user?.id ?? null)
    if (!snapshot) {
      return NextResponse.json({ block: null })
    }
    return NextResponse.json({ block: snapshot })
  } catch (e) {
    console.error('[echoes/feed-block]', e)
    return NextResponse.json({ block: null })
  }
}
