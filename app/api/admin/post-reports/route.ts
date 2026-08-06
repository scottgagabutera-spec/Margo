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

export async function GET(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  const status = request.nextUrl.searchParams.get('status') || 'pending'
  const admin = getSupabaseAdmin()

  let q = admin
    .from('post_reports')
    .select(`
      id,
      post_id,
      reporter_id,
      reason,
      status,
      created_at,
      posts:post_id ( id, text, status, song_title, artist_name, author_profile_id ),
      profiles:reporter_id ( username, display_name )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    q = q.eq('status', status)
  }

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []).map((row: any) => {
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts
    const reporter = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      postId: row.post_id,
      reporterId: row.reporter_id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      postText: post?.text ?? '',
      postStatus: post?.status ?? null,
      song: post?.song_title ?? null,
      artist: post?.artist_name ?? null,
      authorProfileId: post?.author_profile_id ?? null,
      reporterUsername: reporter?.username ?? null,
      reporterDisplayName: reporter?.display_name ?? null,
    }
  })

  return NextResponse.json({ reports: rows })
}

export async function PATCH(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  const body = await request.json().catch(() => null)
  const id = body?.id as string | undefined
  const status = body?.status as string | undefined
  if (!id || !status || !['pending', 'reviewed', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'id and status (pending|reviewed|dismissed) required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('post_reports')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
