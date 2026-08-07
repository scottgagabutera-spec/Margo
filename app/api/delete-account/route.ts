// app/api/delete-account/route.ts
//
// Hard-deletes the caller's account: storage objects, related Supabase rows,
// then auth.users. Prefers transactional RPC purge_user_account_data when
// migration 20260810 is applied; otherwise fail-loud JS purge.
// A failed step returns 500 with detail — never silent partial success.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  purgeUserAccountDataJs,
  removeUserStoragePrefix,
} from '@/lib/purge-user-account'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('[delete-account] Missing Supabase env vars')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Prefer cookie session (Phase 3).
  const supabase = await createServerSupabase()
  let userId: string | null = null
  const { data: cookieUserData, error: cookieUserError } = await supabase.auth.getUser()
  if (!cookieUserError && cookieUserData?.user) {
    userId = cookieUserData.user.id
  }

  // TEMPORARY: Bearer fallback for callers not yet migrated to cookie auth.
  // Remove once settings/page.tsx and useArtistApplication.ts are migrated (Phase 5).
  if (!userId) {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token) {
      const bearerClient = createClient(supabaseUrl, anonKey)
      const { data: bearerUserData, error: bearerError } =
        await bearerClient.auth.getUser(token)
      if (!bearerError && bearerUserData?.user) {
        userId = bearerUserData.user.id
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  let body: { confirmUsername?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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

  try {
    await removeUserStoragePrefix(admin, 'avatars', userId)
    await removeUserStoragePrefix(admin, 'song-audio', userId)
    await removeUserStoragePrefix(admin, 'song-artwork', userId)

    const { error: purgeError } = await admin.rpc('purge_user_account_data', {
      p_user_id: userId,
      p_username: profile.username,
    })

    if (purgeError) {
      console.error('[delete-account] RPC purgeError (full):', {
        code: purgeError.code,
        message: purgeError.message,
        details: purgeError.details,
        hint: purgeError.hint,
      })
      // Only PostgREST "function not exposed" — do NOT match Postgres
      // "operator does not exist" (42883) via a broad "does not exist" regex.
      const trulyMissing =
        purgeError.code === 'PGRST202' ||
        /could not find the function/i.test(purgeError.message || '')
      if (!trulyMissing) {
        throw new Error(
          `[purge_user_account_data] [${purgeError.code}] ${purgeError.message}`,
        )
      }
      console.warn(
        '[delete-account] RPC missing from schema cache — applying JS purge',
      )
      await purgeUserAccountDataJs(admin, userId, profile.username)
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      throw new Error(`[auth.deleteUser] ${deleteAuthError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[delete-account] failed for', userId, message)
    return NextResponse.json(
      {
        error:
          'Account deletion failed partway through. No success was recorded — contact support if the problem persists.',
        detail: message,
      },
      { status: 500 },
    )
  }
}
