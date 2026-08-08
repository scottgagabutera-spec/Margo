import { NextRequest, NextResponse } from 'next/server'
import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type FeaturedForm = {
  text: string
  artist: string
  song: string
  username: string
  reply: {
    text: string
    artist: string
    song: string
    username: string
  }
}

const EMPTY_FORM: FeaturedForm = {
  text: '',
  artist: '',
  song: '',
  username: '',
  reply: { text: '', artist: '', song: '', username: '' },
}

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

function rowToForm(row: Record<string, unknown> | null): FeaturedForm {
  if (!row) return { ...EMPTY_FORM, reply: { ...EMPTY_FORM.reply } }
  return {
    text: String(row.post_text ?? ''),
    artist: String(row.post_artist ?? ''),
    song: String(row.post_song ?? ''),
    username: String(row.post_username ?? ''),
    reply: {
      text: String(row.reply_text ?? ''),
      artist: String(row.reply_artist ?? ''),
      song: String(row.reply_song ?? ''),
      username: String(row.reply_username ?? ''),
    },
  }
}

/** Store whatever is given — visibility ("both lyrics") is landing-only. */
function formToRow(form: FeaturedForm) {
  return {
    id: 1,
    post_text: form.text ?? '',
    post_artist: form.artist ?? '',
    post_song: form.song ?? '',
    post_username: form.username ?? '',
    reply_text: form.reply?.text ?? '',
    reply_artist: form.reply?.artist ?? '',
    reply_song: form.reply?.song ?? '',
    reply_username: form.reply?.username ?? '',
    updated_at: new Date().toISOString(),
  }
}

function normalizeBody(body: any): FeaturedForm {
  return {
    text: typeof body?.text === 'string' ? body.text : '',
    artist: typeof body?.artist === 'string' ? body.artist : '',
    song: typeof body?.song === 'string' ? body.song : '',
    username: typeof body?.username === 'string' ? body.username : '',
    reply: {
      text: typeof body?.reply?.text === 'string' ? body.reply.text : '',
      artist: typeof body?.reply?.artist === 'string' ? body.reply.artist : '',
      song: typeof body?.reply?.song === 'string' ? body.reply.song : '',
      username: typeof body?.reply?.username === 'string' ? body.reply.username : '',
    },
  }
}

export async function GET(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  const { data, error } = await getSupabaseAdmin()
    .from('site_featured_exchange')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('[admin/featured] GET failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ featured: rowToForm(data) })
}

export async function PUT(request: NextRequest) {
  const gate = await assertAdmin(request)
  if (!gate.ok) return gate.res

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const form = normalizeBody(body)
  const row = formToRow(form)

  const { data, error } = await getSupabaseAdmin()
    .from('site_featured_exchange')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    console.error('[admin/featured] PUT failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ featured: rowToForm(data) })
}
