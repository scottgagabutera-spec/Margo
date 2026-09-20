import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { persistPostExportPrefs } from '@/lib/promote/export-prefs'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId, MomentThemeId } from '@/lib/moment/types'

export async function PATCH(request: Request) {
  const supabase = await createServerSupabase()
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr || !auth.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    postId?: string
    exportShapeId?: MomentShapeId
    exportThemeId?: MomentThemeId
    exportAtmosphereId?: AtmosphereId
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.postId || !body.exportShapeId || !body.exportThemeId || !body.exportAtmosphereId) {
    return NextResponse.json({ error: 'postId and export prefs are required' }, { status: 400 })
  }

  try {
    await persistPostExportPrefs(supabase, {
      postId: body.postId,
      authorId: auth.user.id,
      exportShapeId: body.exportShapeId,
      exportThemeId: body.exportThemeId,
      exportAtmosphereId: body.exportAtmosphereId,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save export prefs'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
