import { NextRequest, NextResponse } from 'next/server'
import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { assertAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
}

/**
 * One-shot: copy RTDB adminConfig/featuredLyric into site_featured_exchange.
 * Same field convention as PUT (store as-is; landing hides unless both lyrics set).
 * Gate is Supabase is_admin; Firebase Admin is only for RTDB read (until A6).
 */
export async function POST(_request: NextRequest) {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  try {
    const app = getAdminApp()
    const snap = await getDatabase(app).ref('adminConfig/featuredLyric').get()
    const val = snap.exists() ? snap.val() : null

    const form = {
      text: typeof val?.text === 'string' ? val.text : '',
      artist: typeof val?.artist === 'string' ? val.artist : '',
      song: typeof val?.song === 'string' ? val.song : '',
      username: typeof val?.username === 'string' ? val.username : '',
      reply: {
        text: typeof val?.reply?.text === 'string' ? val.reply.text : '',
        artist: typeof val?.reply?.artist === 'string' ? val.reply.artist : '',
        song: typeof val?.reply?.song === 'string' ? val.reply.song : '',
        username: typeof val?.reply?.username === 'string' ? val.reply.username : '',
      },
    }

    const row = {
      id: 1,
      post_text: form.text,
      post_artist: form.artist,
      post_song: form.song,
      post_username: form.username,
      reply_text: form.reply.text,
      reply_artist: form.reply.artist,
      reply_song: form.reply.song,
      reply_username: form.reply.username,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await getSupabaseAdmin()
      .from('site_featured_exchange')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      console.error('[admin/featured/import-rtdb] upsert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      imported: true,
      hadRtdbValue: !!val,
      featured: {
        text: data.post_text ?? '',
        artist: data.post_artist ?? '',
        song: data.post_song ?? '',
        username: data.post_username ?? '',
        reply: {
          text: data.reply_text ?? '',
          artist: data.reply_artist ?? '',
          song: data.reply_song ?? '',
          username: data.reply_username ?? '',
        },
      },
    })
  } catch (e: any) {
    console.error('[admin/featured/import-rtdb] failed:', e)
    return NextResponse.json({ error: e?.message || 'Import failed' }, { status: 500 })
  }
}
