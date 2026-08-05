import { NextRequest, NextResponse } from 'next/server'
import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
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
 * Read-only Supabase posts catalog for the admin Posts tab (includes
 * status=private). Auth: Firebase ID token must match adminConfig/allowedUid.
 * Uses service-role Supabase client — never expose that key to the browser.
 */
export async function GET(request: NextRequest) {
  try {
    const header = request.headers.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const app = getAdminApp()
    const decoded = await getAuth(app).verifyIdToken(token)
    const allowedSnap = await getDatabase(app).ref('adminConfig/allowedUid').get()
    if (allowedSnap.val() !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('posts')
      .select(`
        id,
        text,
        emotion,
        status,
        song_title,
        artist_name,
        legacy_author_label,
        author_profile_id,
        created_at,
        flag_count,
        parent_post_id,
        profiles:author_profile_id ( username, display_name )
      `)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      console.error('[catalog-posts]', error)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    const posts = (data ?? []).map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id,
        text: row.text ?? '',
        emotion: row.emotion ?? null,
        status: row.status ?? 'active',
        song: row.song_title ?? null,
        artist: row.artist_name ?? null,
        username: profile?.username ?? row.legacy_author_label ?? null,
        displayName: profile?.display_name ?? null,
        createdAt: row.created_at ?? null,
        flagCount: row.flag_count ?? 0,
      }
    })

    return NextResponse.json({ posts })
  } catch (e: any) {
    console.error('[catalog-posts]', e)
    return NextResponse.json({ error: e?.message || 'Unauthorized' }, { status: 401 })
  }
}
