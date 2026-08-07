/**
 * Verification script for complete account deletion.
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/verify-account-deletion.mjs
 *
 * Optional: apply supabase/migrations/20260810_complete_account_deletion.sql
 * first — then the API will use the transactional RPC. This script exercises
 * the same JS purge path the API falls back to (and matches its table list).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
function loadEnvFile() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  const text = readFileSync(p, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
}

loadEnvFile()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !service) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const stamp = Date.now()
const email = `delete-test-${stamp}@example.com`
const password = `TestDelete_${stamp}!aA1`
const username = `del${String(stamp).slice(-10)}`

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function removeBucketPrefix(bucket, userId) {
  const { data: entries, error: listError } = await admin.storage
    .from(bucket)
    .list(userId, { limit: 1000 })
  if (listError) {
    const msg = listError.message || String(listError)
    if (/not found|does not exist/i.test(msg)) return
    throw new Error(`[storage:${bucket}] list failed: ${msg}`)
  }
  if (!entries?.length) return
  const paths = entries
    .filter((e) => e.name && e.name !== '.emptyFolderPlaceholder')
    .map((e) => `${userId}/${e.name}`)
  if (!paths.length) return
  const { error } = await admin.storage.from(bucket).remove(paths)
  if (error) throw new Error(`[storage:${bucket}] remove failed: ${error.message}`)
}

async function purgeJs(userId, uname) {
  // Inlined mirror of lib/purge-user-account.ts (keep in sync).
  const authored = []
  {
    const { data, error } = await admin.from('posts').select('id').eq('author_profile_id', userId)
    if (error) throw new Error(error.message)
    for (const row of data || []) authored.push(row.id)
  }
  const tree = new Set(authored)
  let frontier = [...authored]
  while (frontier.length) {
    const { data, error } = await admin.from('posts').select('id').in('parent_post_id', frontier)
    if (error) throw new Error(error.message)
    frontier = []
    for (const row of data || []) {
      if (!tree.has(row.id)) {
        tree.add(row.id)
        frontier.push(row.id)
      }
    }
  }
  const postIds = [...tree]
  const del = async (label, q) => {
    const { error } = await q
    if (error) throw new Error(`[${label}] ${error.message}`)
  }
  if (postIds.length) {
    await del('post_resonates', admin.from('post_resonates').delete().in('post_id', postIds))
    await del('post_reports', admin.from('post_reports').delete().in('post_id', postIds))
    await del('post_replays', admin.from('post_replays').delete().in('post_id', postIds))
    await del('post_stats', admin.from('post_stats').delete().in('post_id', postIds))
    await del('notifications/post', admin.from('notifications').delete().in('post_id', postIds.map(String)))
    let remaining = new Set(postIds)
    let guard = 0
    while (remaining.size && guard < 50) {
      guard++
      const ids = [...remaining]
      const { data: children, error } = await admin
        .from('posts')
        .select('parent_post_id')
        .in('parent_post_id', ids)
      if (error) throw new Error(error.message)
      const hasChild = new Set((children || []).map((c) => c.parent_post_id).filter(Boolean))
      const leaves = ids.filter((id) => !hasChild.has(id))
      if (!leaves.length) throw new Error('stuck deleting posts')
      await del('posts', admin.from('posts').delete().in('id', leaves))
      for (const id of leaves) remaining.delete(id)
    }
  }
  await del('resonates uuid', admin.from('post_resonates').delete().eq('actor_id', userId))
  await del('resonates name', admin.from('post_resonates').delete().eq('actor_id', uname))
  await del('replays', admin.from('post_replays').delete().eq('replayer_id', userId))
  await del('reports', admin.from('post_reports').delete().eq('reporter_id', userId))
  await del('song_resonates', admin.from('song_resonates').delete().eq('actor_id', userId))
  await del('notif recip', admin.from('notifications').delete().eq('recipient_id', userId))
  await del('notif actor', admin.from('notifications').delete().eq('actor_id', userId))
  await del('messages', admin.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`))
  await del('follows', admin.from('follows').delete().or(`follower_id.eq.${userId},followee_id.eq.${userId}`))
  await del('artist_applications', admin.from('artist_applications').delete().eq('profile_id', userId))
  await del('songs', admin.from('songs').delete().eq('owner_profile_id', userId))
  await del('profiles', admin.from('profiles').delete().eq('id', userId))
}

async function countEq(table, column, value) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value)
  if (error) throw new Error(`count ${table}.${column}: ${error.message}`)
  return count ?? 0
}

async function main() {
  console.log('Creating throwaway user…')
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) throw new Error(`createUser: ${createErr?.message}`)
  const userId = created.user.id
  console.log('  userId =', userId)
  console.log('  username =', username)

  // Prefer updating auto-created profile; else insert
  const { data: existing } = await admin.from('profiles').select('id, username').eq('id', userId).maybeSingle()
  if (existing) {
    const { error } = await admin.from('profiles').update({ username, display_name: 'Delete Test' }).eq('id', userId)
    if (error) throw new Error(`profiles update: ${error.message}`)
  } else {
    const { error } = await admin.from('profiles').insert({ id: userId, username, display_name: 'Delete Test' })
    if (error) throw new Error(`profiles insert: ${error.message}`)
  }

  const postId = crypto.randomUUID()
  const songId = crypto.randomUUID()

  const { error: postErr } = await admin.from('posts').insert({
    id: postId,
    author_profile_id: userId,
    text: 'delete-me lyric for account deletion test',
    emotion: 'CHILL',
    status: 'active',
    flag_count: 0,
    parent_post_id: null,
    lang: 'en',
  })
  if (postErr) throw new Error(`posts insert: ${postErr.message}`)

  let resonateActor = userId
  {
    const { error: resErr } = await admin.from('post_resonates').insert({
      post_id: postId,
      actor_id: userId,
    })
    if (resErr) {
      resonateActor = username
      const { error: resErr2 } = await admin.from('post_resonates').insert({
        post_id: postId,
        actor_id: username,
      })
      if (resErr2) throw new Error(`post_resonates: ${resErr2.message}`)
    }
  }

  const { error: notifErr } = await admin.from('notifications').insert({
    recipient_id: userId,
    actor_id: userId,
    type: 'resonate',
    post_id: postId,
  })
  if (notifErr) console.warn('  notifications insert skipped:', notifErr.message)

  const { error: songErr } = await admin.from('songs').insert({
    id: songId,
    owner_profile_id: userId,
    title: 'Delete Test Song',
    artist_display_name: 'Delete Test',
    artwork_url: 'https://example.com/art.png',
    audio_url: 'https://example.com/audio.mp3',
    status: 'processing',
  })
  if (songErr) throw new Error(`songs insert: ${songErr.message}`)

  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const tinyMp3 = Buffer.from('ID3', 'utf8')

  for (const [bucket, path, body, type] of [
    ['avatars', `${userId}/avatar.png`, tinyPng, 'image/png'],
    ['song-audio', `${userId}/${songId}.mp3`, tinyMp3, 'audio/mpeg'],
    ['song-artwork', `${userId}/${songId}.png`, tinyPng, 'image/png'],
  ]) {
    const { error } = await admin.storage.from(bucket).upload(path, body, {
      contentType: type,
      upsert: true,
    })
    if (error) throw new Error(`storage upload ${bucket}: ${error.message}`)
  }

  console.log('Fixtures OK. Purging (storage + DB + auth)…')

  await removeBucketPrefix('avatars', userId)
  await removeBucketPrefix('song-audio', userId)
  await removeBucketPrefix('song-artwork', userId)

  // Prefer RPC when migration applied — always log full error before any fallback
  const { data: purgeData, error: purgeError } = await admin.rpc('purge_user_account_data', {
    p_user_id: userId,
    p_username: username,
  })
  if (purgeError) {
    console.error('  RPC purgeError (full):', JSON.stringify({
      code: purgeError.code,
      message: purgeError.message,
      details: purgeError.details,
      hint: purgeError.hint,
      name: purgeError.name,
      status: purgeError.status,
    }, null, 2))
    // Only treat PostgREST "function not in schema cache" as missing — NOT
    // Postgres runtime errors like 42883 ("operator does not exist").
    const trulyMissing =
      purgeError.code === 'PGRST202' ||
      /could not find the function/i.test(purgeError.message || '')
    console.error('  trulyMissing classification =', trulyMissing)
    if (!trulyMissing) {
      throw new Error(`RPC: [${purgeError.code}] ${purgeError.message}`)
    }
    console.warn('  RPC not found in PostgREST schema cache — using JS purge path')
    await purgeJs(userId, username)
  } else {
    console.log('  used transactional RPC purge_user_account_data', purgeData === null || purgeData === undefined ? '(void)' : purgeData)
  }

  const { error: authDelErr } = await admin.auth.admin.deleteUser(userId)
  if (authDelErr) throw new Error(`auth.deleteUser: ${authDelErr.message}`)

  console.log('Asserting cleanup…')
  assert((await countEq('profiles', 'id', userId)) === 0, 'profile still exists')
  assert((await countEq('posts', 'author_profile_id', userId)) === 0, 'posts remain')
  assert((await countEq('posts', 'id', postId)) === 0, 'post id still exists')
  assert((await countEq('songs', 'owner_profile_id', userId)) === 0, 'songs remain')
  assert((await countEq('songs', 'id', songId)) === 0, 'song id still exists')
  assert((await countEq('notifications', 'recipient_id', userId)) === 0, 'notifications remain')
  assert((await countEq('artist_applications', 'profile_id', userId)) === 0, 'artist_applications remain')
  assert((await countEq('post_replays', 'replayer_id', userId)) === 0, 'post_replays remain')

  const { count: resonateLeft, error: rErr } = await admin
    .from('post_resonates')
    .select('*', { count: 'exact', head: true })
    .or(`actor_id.eq.${userId},actor_id.eq.${username},actor_id.eq.${resonateActor}`)
  if (rErr) throw new Error(rErr.message)
  assert((resonateLeft ?? 0) === 0, 'post_resonates remain')

  for (const bucket of ['avatars', 'song-audio', 'song-artwork']) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 10 })
    if (error && !/not found|does not exist/i.test(error.message)) {
      throw new Error(`list ${bucket}: ${error.message}`)
    }
    const leftover = (data || []).filter((e) => e.name && e.name !== '.emptyFolderPlaceholder')
    assert(leftover.length === 0, `storage ${bucket} still has: ${leftover.map((e) => e.name).join(',')}`)
  }

  const { data: authLookup, error: authLookupErr } = await admin.auth.admin.getUserById(userId)
  if (authLookupErr && !/not (found|Found)|User not found/i.test(authLookupErr.message || '')) {
    throw new Error(`getUserById: ${authLookupErr.message}`)
  }
  assert(!authLookup?.user, 'auth user still exists')

  console.log('\nPASS — throwaway account fully removed from DB + storage + auth.')
  console.log('Spot-check userId in Supabase Table Editor / Storage (should be absent):', userId)
}

main().catch((err) => {
  console.error('\nFAIL —', err.message || err)
  process.exit(1)
})
