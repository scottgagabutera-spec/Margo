/**
 * Prove cookie-session client can write profiles (RLS) — the Phase 2
 * 42501 failure mode when localStorage client had no JWT.
 * Also asserts Tier A HttpOnly Set-Cookie + no refresh_token leak via Auth core routes.
 *
 * Usage (Next must be running for Tier A checks): node scripts/verify-identity-cookie-profile.mjs
 * Optional: VERIFY_BASE_URL (default http://localhost:3000)
 */
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { verifyHttpOnlyAuthCore } from './lib/assert-httponly-auth.mjs'

function loadEnvFile() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
}

loadEnvFile()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = (process.env.VERIFY_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
if (!url || !anonKey || !service) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function cookieClient() {
  const jar = new Map()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Array.from(jar.entries()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          if (value) jar.set(name, value)
          else jar.delete(name)
        }
      },
    },
  })
  return { supabase, jar }
}

async function main() {
  const stamp = Date.now()
  const email = `phase4-id-${stamp}@example.com`
  const password = `Phase4Id_${stamp}!aA1`
  const username = `p4i${String(stamp).slice(-10)}`

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (cErr || !created.user) throw new Error(cErr?.message || 'createUser')
  const userId = created.user.id
  console.log('created user', userId)

  // Negative control: unauthenticated anon write must fail RLS
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: anonErr } = await anon.from('profiles').insert({
    id: userId,
    username: `${username}_anon`,
    display_name: 'Should Fail',
  })
  console.log('anon insert →', anonErr?.code || 'unexpected success', anonErr?.message || '')
  if (!anonErr || anonErr.code !== '42501') {
    throw new Error(`expected anon RLS 42501, got ${JSON.stringify(anonErr)}`)
  }

  // Tier A: real /api/auth/login Set-Cookie is HttpOnly; no refresh_token leak
  console.log('VERIFY_BASE_URL =', baseUrl)
  await verifyHttpOnlyAuthCore({ baseUrl, email, password })

  // Cookie-session client (same storage model as lib/supabase/client.ts)
  const { supabase } = cookieClient()
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signErr) throw new Error(`signIn: ${signErr.message}`)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw new Error(`getUser: ${userErr?.message || 'no user'}`)
  if (userData.user.id !== userId) throw new Error('signed-in user mismatch')

  // ensureProfile-style insert (the Phase 2 failure mode)
  const { data: inserted, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username,
      display_name: 'Phase4 Cookie Identity',
    })
    .select()
    .single()
  console.log('cookie insert →', insertErr?.code || 'ok', insertErr?.message || inserted?.username)
  if (insertErr) {
    throw new Error(`cookie profile insert failed: [${insertErr.code}] ${insertErr.message}`)
  }

  // Profile update (same JWT path useIdentity uses after Phase 4)
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ display_name: 'Phase4 Updated' })
    .eq('id', userId)
  console.log('cookie update →', updateErr?.code || 'ok', updateErr?.message || '')
  if (updateErr) {
    throw new Error(`cookie profile update failed: [${updateErr.code}] ${updateErr.message}`)
  }

  await admin.from('profiles').delete().eq('id', userId)
  await admin.auth.admin.deleteUser(userId)
  console.log(
    'PASS — cookie-session client can insert/update profiles; RLS 42501 only hits unauthenticated; Tier A HttpOnly auth OK',
  )
}

main().catch(async (err) => {
  console.error('FAIL —', err.message || err)
  process.exit(1)
})
