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

async function assertAdmin(request: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  try {
    const app = getAdminApp()
    const decoded = await getAuth(app).verifyIdToken(token)
    const allowedSnap = await getDatabase(app).ref('adminConfig/allowedUid').get()
    if (allowedSnap.val() !== decoded.uid) {
      return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, res: NextResponse.json({ error: e?.message || 'Unauthorized' }, { status: 401 }) }
  }
}

const SONG_SELECT = `
  id,
  title,
  artist_display_name,
  status,
  artwork_url,
  audio_url,
  owner_profile_id,
  created_at,
  "order",
  profiles:owner_profile_id ( username, display_name, artist_status )
`

/**
 * Read-only Supabase songs catalog for admin Music → Catalog tab.
 * Service role: returns ALL songs (every status, every owner standing),
 * including drafts and songs owned by frozen/removed artists.
 */
export async function GET(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('songs')
      .select(SONG_SELECT)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('[catalog-songs]', error)
      return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 })
    }

    const songs = (data ?? []).map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id,
        title: row.title ?? '',
        artistDisplayName: row.artist_display_name ?? '',
        status: row.status ?? 'draft',
        artworkUrl: row.artwork_url ?? null,
        audioUrl: row.audio_url ?? null,
        ownerProfileId: row.owner_profile_id ?? null,
        ownerUsername: profile?.username ?? null,
        ownerDisplayName: profile?.display_name ?? null,
        artistStatus: profile?.artist_status ?? null,
        createdAt: row.created_at ?? null,
        order: row.order ?? null,
      }
    })

    return NextResponse.json({ songs })
  } catch (e: any) {
    console.error('[catalog-songs]', e)
    return NextResponse.json({ error: e?.message || 'Failed to load songs' }, { status: 500 })
  }
}
