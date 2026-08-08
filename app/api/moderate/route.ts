import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function writeFlagCount(postId: string): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('posts')
      .update({ flag_count: 10 })
      .eq('id', postId)
    if (error) {
      console.error('[moderate] Failed to write flag_count:', error.message, {
        code: error.code,
        postId,
      })
    }
  } catch (e) {
    console.error('[moderate] Failed to write flag_count:', e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, postId } = body as {
      text?: string
      postId?: string
      /** Dev-only: skip OpenAI and force flagged=true to verify flag_count writes. */
      forceFlagged?: boolean
    }

    // Local/dev only — never honored in production builds.
    const forceFlagged =
      process.env.NODE_ENV === 'development' && body?.forceFlagged === true

    if (forceFlagged) {
      if (postId) await writeFlagCount(postId)
      return NextResponse.json({ flagged: true, categories: {}, scores: {}, forced: true })
    }

    if (!text) return NextResponse.json({ flagged: false })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ flagged: false })

    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) return NextResponse.json({ flagged: false })
    const data = await res.json()
    const result = data.results?.[0]
    const flagged = result?.flagged || false
    const categories = result?.categories || {}
    const scores = result?.category_scores || {}

    if (flagged && postId) {
      await writeFlagCount(postId)
    }

    return NextResponse.json({ flagged, categories, scores })
  } catch (err: any) {
    return NextResponse.json({ flagged: false, detail: err.message })
  }
}
