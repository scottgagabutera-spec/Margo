/**
 * Cookie-session smoke for POST /api/submit-artist-application.
 * Asserts unauth + Bearer-only → 401; cookie session → success.
 * Usage (Next must be running): node scripts/verify-submit-artist-cookie.mjs
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

async function cookieHeaderFromPasswordSignIn(email, password) {
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
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn: ${error.message}`)
  if (jar.size === 0) throw new Error('no auth cookies written')
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

async function accessTokenFromPasswordSignIn(email, password) {
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) {
    throw new Error(`bearer signIn: ${error?.message || 'no access_token'}`)
  }
  return data.session.access_token
}

async function createThrowaway(prefix) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000)
  const email = `${prefix}-${stamp}@example.com`
  const password = `ArtistTest_${stamp}!aA1`
  const username = `${prefix.slice(0, 3)}${String(stamp).slice(-10)}`
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (cErr || !created.user) throw new Error(cErr?.message || 'createUser')
  const userId = created.user.id
  const { error: pErr } = await admin.from('profiles').insert({
    id: userId,
    username,
    display_name: `${prefix} Test`,
  })
  if (pErr) throw new Error(`profile: ${pErr.message}`)
  return { userId, email, password, username }
}

async function cleanupUser(userId) {
  await admin.from('artist_applications').delete().eq('profile_id', userId)
  await admin.from('profiles').delete().eq('id', userId)
  await admin.auth.admin.deleteUser(userId)
}

async function main() {
  const cookieUser = await createThrowaway('artc')
  const bearerUser = await createThrowaway('artb')

  try {
    const unauth = await fetch(`${baseUrl}/api/submit-artist-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicantType: 'independent',
        displayArtistName: 'X',
        links: { website: 'https://example.com' },
        rightsAgreed: true,
      }),
    })
    const unauthBody = await unauth.json()
    console.log('unauth →', unauth.status, unauthBody)
    if (unauth.status !== 401) throw new Error(`expected 401 without auth, got ${unauth.status}`)

    // Tier A: real /api/auth/login Set-Cookie is HttpOnly; no refresh_token leak
    await verifyHttpOnlyAuthCore({
      baseUrl,
      email: cookieUser.email,
      password: cookieUser.password,
    })

    const cookie = await cookieHeaderFromPasswordSignIn(cookieUser.email, cookieUser.password)
    const cookieRes = await fetch(`${baseUrl}/api/submit-artist-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        applicantType: 'independent',
        displayArtistName: 'Cookie Auth Band',
        links: { website: 'https://example.com/band' },
        note: 'cookie auth smoke',
        rightsAgreed: true,
      }),
    })
    const cookieBody = await cookieRes.json()
    console.log('cookie auth →', cookieRes.status, cookieBody)
    if (cookieRes.status === 401) throw new Error('cookie session rejected')
    if (!cookieRes.ok || !cookieBody.success) {
      throw new Error(`cookie submit failed: ${JSON.stringify(cookieBody)}`)
    }

    const token = await accessTokenFromPasswordSignIn(bearerUser.email, bearerUser.password)
    const bearerRes = await fetch(`${baseUrl}/api/submit-artist-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        applicantType: 'independent',
        displayArtistName: 'Bearer Rejected Band',
        links: { website: 'https://example.com/bearer-band' },
        note: 'bearer must 401 after fallback removal',
        rightsAgreed: true,
      }),
    })
    const bearerBody = await bearerRes.json()
    console.log('Bearer-only auth →', bearerRes.status, bearerBody)
    if (bearerRes.status !== 401) {
      throw new Error(`expected 401 for Bearer-only auth, got ${bearerRes.status}`)
    }

    console.log('PASS — submit-artist-application accepts cookie; rejects Bearer-only; Tier A HttpOnly auth OK')
  } finally {
    await cleanupUser(cookieUser.userId)
    await cleanupUser(bearerUser.userId)
  }
}

main().catch((err) => {
  console.error('FAIL —', err.message || err)
  process.exit(1)
})
