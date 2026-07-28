// supabase/functions/delete-account/index.ts
//
// Deploy with: supabase functions deploy delete-account
// Requires these secrets set on the project (Dashboard -> Edge Functions -> Secrets,
// or `supabase secrets set`):
//   SUPABASE_URL               (already available by default)
//   SUPABASE_ANON_KEY          (already available by default)
//   SUPABASE_SERVICE_ROLE_KEY  (add manually — never expose this to the client)
//
// Call from the app with the user's own access token in the Authorization header,
// and { confirmUsername: "<their exact username>" } as the body.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verify the caller is who they claim to be, using their own JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })
  }
  const userId = userData.user.id

  let body: { confirmUsername?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 })
  }

  if (!body.confirmUsername || body.confirmUsername !== profile.username) {
    return new Response(
      JSON.stringify({ error: 'Username confirmation did not match' }),
      { status: 400 },
    )
  }

  // Clean up dependent rows first. If your foreign keys already use
  // ON DELETE CASCADE, these are redundant but harmless — safer to be explicit
  // than to assume cascade behavior that may not be set up yet.
  await admin.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  await admin.from('follows').delete().or(`follower_id.eq.${userId},followee_id.eq.${userId}`)

  // ASSUMPTION: artist_applications has a user_id column. If it's named
  // differently, update this line to match.
  await admin.from('artist_applications').delete().eq('user_id', userId)

  await admin.from('profiles').delete().eq('id', userId)

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})