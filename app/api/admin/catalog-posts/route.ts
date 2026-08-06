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

const POST_SELECT = `
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
`

function mapCatalogPost(row: any) {
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
}

/** Echo shape aligned with admin PostsTab / useEchoes mapping. */
function mapEcho(row: any) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id,
    lyric: row.text ?? '',
    song: row.song_title ?? '',
    artist: row.artist_name ?? '',
    emotion: row.emotion ?? '',
    username: profile?.username ?? row.legacy_author_label ?? 'anon',
    displayName: profile?.display_name ?? undefined,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : 0,
    status: row.status ?? 'active',
  }
}

/**
 * GET without query: top-level catalog posts (parent_post_id is null).
 * GET ?parent_post_id=: child lyric backs for admin moderation — includes
 * hidden and private (service role; unlike public useEchoes).
 */
export async function GET(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  try {
    const admin = getSupabaseAdmin()
    const parentId = request.nextUrl.searchParams.get('parent_post_id')?.trim() || ''

    if (parentId) {
      const { data, error } = await admin
        .from('posts')
        .select(POST_SELECT)
        .eq('parent_post_id', parentId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('[catalog-posts echoes]', error)
        return NextResponse.json({ error: 'Failed to load lyric backs' }, { status: 500 })
      }

      return NextResponse.json({ echoes: (data ?? []).map(mapEcho) })
    }

    const { data, error } = await admin
      .from('posts')
      .select(POST_SELECT)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      console.error('[catalog-posts]', error)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    return NextResponse.json({ posts: (data ?? []).map(mapCatalogPost) })
  } catch (e: any) {
    console.error('[catalog-posts]', e)
    return NextResponse.json({ error: e?.message || 'Failed to load posts' }, { status: 500 })
  }
}

const ALLOWED_STATUS = new Set(['active', 'hidden', 'private'])

/**
 * Set status on any posts row by id (top-level or lyric-back reply).
 * Body: { id: string, status: 'active' | 'hidden' | 'private' }
 */
export async function PATCH(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  try {
    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const status = typeof body.status === 'string' ? body.status.trim() : ''

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'status must be active, hidden, or private' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('posts')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .maybeSingle()

    if (error) {
      console.error('[catalog-posts PATCH]', error)
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ id: data.id, status: data.status })
  } catch (e: any) {
    console.error('[catalog-posts PATCH]', e)
    return NextResponse.json({ error: e?.message || 'Failed to update post' }, { status: 500 })
  }
}
