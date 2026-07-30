// app/api/delete-account/route.ts
//
// Runs on Vercel as part of the normal Next.js deploy — no separate CLI or
// deploy step needed. Reads SUPABASE_SERVICE_ROLE_KEY from Vercel's
// Environment Variables (Production/Preview), which is never sent to the
// browser because this file only runs on the server.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Verify the caller is who they claim to be, using their own access token.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  const userId = userData.user.id

  let body: { confirmUsername?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Service-role client — full access, never exposed to the browser.
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!body.confirmUsername || body.confirmUsername !== profile.username) {
    return NextResponse.json(
      { error: 'Username confirmation did not match' },
      { status: 400 },
    )
  }

  // Clean up dependent rows first. If your foreign keys already use
  // ON DELETE CASCADE, these are redundant but harmless.
  await admin.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  await admin.from('follows').delete().or(`follower_id.eq.${userId},followee_id.eq.${userId}`)

  // ASSUMPTION: artist_applications has a user_id column. If it's named
  // differently, update this line to match.
  await admin.from('artist_applications').delete().eq('user_id', userId)

  await admin.from('profiles').delete().eq('id', userId)

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}