/**
 * Verification script for complete account deletion.
 *
 * Includes a linked-song case:
 *  - owned post with posts.song_id set (must be deleted with the account)
 *  - third-party post referencing the same song (must SURVIVE with song_id = null)
 *  - queue_items on own queue + (if possible) another owner's queue
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Usage: node scripts/verify-account-deletion.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
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

async function tableExists(name) {
  const { error } = await admin.from(name).select('*', { head: true, count: 'exact' }).limit(1)
  if (!error) return true
  if (/schema cache|does not exist|Could not find the table/i.test(error.message || '')) return false
  // Other errors still mean the relation is addressable
  return true
}

async function countEq(table, column, value) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value)
  if (error) throw new Error(`count ${table}.${column}: ${error.message}`)
  return count ?? 0
}

async function ensureProfile(userId, uname, displayName) {
  const { data: existing } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (existing) {
    const { error } = await admin
      .from('profiles')
      .update({ username: uname, display_name: displayName })
      .eq('id', userId)
    if (error) throw new Error(`profiles update: ${error.message}`)
  } else {
    const { error } = await admin
      .from('profiles')
      .insert({ id: userId, username: uname, display_name: displayName })
    if (error) throw new Error(`profiles insert: ${error.message}`)
  }
}

async function main() {
  const hasQueues = await tableExists('queues')
  const hasQueueItems = await tableExists('queue_items')
  console.log('tables: queues=', hasQueues, 'queue_items=', hasQueueItems)

  console.log('Creating throwaway users (deleter + other)…')
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) throw new Error(`createUser: ${createErr?.message}`)
  const userId = created.user.id

  const otherStamp = stamp + 1
  const otherUsername = `oth${String(otherStamp).slice(-10)}`
  const { data: otherCreated, error: otherCreateErr } = await admin.auth.admin.createUser({
    email: `other-${otherStamp}@example.com`,
    password: `Other_${otherStamp}!aA1`,
    email_confirm: true,
  })
  if (otherCreateErr || !otherCreated.user) throw new Error(`createUser other: ${otherCreateErr?.message}`)
  const otherId = otherCreated.user.id

  console.log('  deleter userId =', userId, 'username =', username)
  console.log('  other   userId =', otherId, 'username =', otherUsername)

  await ensureProfile(userId, username, 'Delete Test')
  await ensureProfile(otherId, otherUsername, 'Other User')

  const ownedPostId = crypto.randomUUID()
  const survivorPostId = crypto.randomUUID()
  const songId = crypto.randomUUID()
  let ownQueueId = null
  let otherQueueId = null

  // 1) Song first so posts can link to it
  const { error: songErr } = await admin.from('songs').insert({
    id: songId,
    owner_profile_id: userId,
    title: 'Linked Delete Test Song',
    artist_display_name: 'Delete Test',
    artwork_url: 'https://example.com/art.png',
    audio_url: 'https://example.com/audio.mp3',
    status: 'processing',
  })
  if (songErr) throw new Error(`songs insert: ${songErr.message}`)
  console.log('  fixture songId =', songId)

  // 2) Owned post WITH song_id — must be deleted with the account
  const { error: postErr } = await admin.from('posts').insert({
    id: ownedPostId,
    author_profile_id: userId,
    text: 'owned lyric linked to song — should be deleted with account',
    emotion: 'CHILL',
    status: 'active',
    flag_count: 0,
    parent_post_id: null,
    lang: 'en',
    song_id: songId,
    song_title: 'Linked Delete Test Song',
    artist_name: 'Delete Test',
  })
  if (postErr) throw new Error(`owned posts insert: ${postErr.message}`)
  console.log('  fixture ownedPostId (with song_id) =', ownedPostId)

  // 3) Third-party post referencing the same song — must SURVIVE with song_id nulled
  const { error: survErr } = await admin.from('posts').insert({
    id: survivorPostId,
    author_profile_id: otherId,
    text: 'other user lyric linked to deleter song — should survive with song_id null',
    emotion: 'HOPE',
    status: 'active',
    flag_count: 0,
    parent_post_id: null,
    lang: 'en',
    song_id: songId,
    song_title: 'Linked Delete Test Song',
    artist_name: 'Delete Test',
  })
  if (survErr) throw new Error(`survivor posts insert: ${survErr.message}`)
  console.log('  fixture survivorPostId (other author, song_id set) =', survivorPostId)

  // 4) Queues / queue_items
  if (hasQueues && hasQueueItems) {
    ownQueueId = crypto.randomUUID()
    const { error: qErr } = await admin.from('queues').insert({
      id: ownQueueId,
      owner_profile_id: userId,
      type: 'song',
      kind: 'manual',
      title: 'Deleter queue',
      is_public: false,
    })
    if (qErr) throw new Error(`queues insert (own): ${qErr.message}`)

    const { error: qiErr } = await admin.from('queue_items').insert({
      queue_id: ownQueueId,
      position: 1,
      song_id: songId,
      added_by_profile_id: userId,
    })
    if (qiErr) throw new Error(`queue_items insert (own): ${qiErr.message}`)
    console.log('  fixture ownQueueId + queue_item song_id =', ownQueueId)

    otherQueueId = crypto.randomUUID()
    const { error: oqErr } = await admin.from('queues').insert({
      id: otherQueueId,
      owner_profile_id: otherId,
      type: 'song',
      kind: 'manual',
      title: 'Other queue with deleter song',
      is_public: false,
    })
    if (oqErr) throw new Error(`queues insert (other): ${oqErr.message}`)

    const { error: oqiErr } = await admin.from('queue_items').insert({
      queue_id: otherQueueId,
      position: 1,
      song_id: songId,
      added_by_profile_id: otherId,
    })
    if (oqiErr) throw new Error(`queue_items insert (other): ${oqiErr.message}`)
    console.log('  fixture otherQueueId + queue_item song_id =', otherQueueId)
  } else {
    console.warn('  queues/queue_items missing — skipped queue fixture')
  }

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

  console.log('Fixtures OK. Purging deleter only…')
  await removeBucketPrefix('avatars', userId)
  await removeBucketPrefix('song-audio', userId)
  await removeBucketPrefix('song-artwork', userId)

  const { error: purgeError } = await admin.rpc('purge_user_account_data', {
    p_user_id: userId,
    p_username: username,
  })
  if (purgeError) {
    console.error('  RPC purgeError (full):', JSON.stringify(purgeError, null, 2))
    throw new Error(`RPC: [${purgeError.code}] ${purgeError.message}`)
  }
  console.log('  used transactional RPC purge_user_account_data')

  const { error: authDelErr } = await admin.auth.admin.deleteUser(userId)
  if (authDelErr) throw new Error(`auth.deleteUser: ${authDelErr.message}`)

  console.log('\n--- Linked-song / queue assertions ---')

  // Song gone
  const songLeft = await countEq('songs', 'id', songId)
  console.log('song row count for songId:', songLeft, '(expect 0)')
  assert(songLeft === 0, 'song still exists')

  // Owned linked post gone
  const ownedLeft = await countEq('posts', 'id', ownedPostId)
  console.log('owned linked post count:', ownedLeft, '(expect 0 — deleted with account)')
  assert(ownedLeft === 0, 'owned linked post still exists')

  // Survivor post kept, song_id nulled by ON DELETE SET NULL
  const { data: survivor, error: survReadErr } = await admin
    .from('posts')
    .select('id, song_id, author_profile_id, text')
    .eq('id', survivorPostId)
    .maybeSingle()
  if (survReadErr) throw new Error(survReadErr.message)
  console.log('survivor post after purge:', JSON.stringify(survivor, null, 2))
  assert(!!survivor, 'survivor post missing — expected SET NULL, not CASCADE on posts')
  assert(survivor.song_id === null, `survivor.song_id expected null, got ${survivor.song_id}`)
  assert(survivor.author_profile_id === otherId, 'survivor author changed unexpectedly')

  if (hasQueues && hasQueueItems) {
    const ownQ = await countEq('queues', 'id', ownQueueId)
    console.log('deleter queue count:', ownQ, '(expect 0)')
    assert(ownQ === 0, 'deleter queue still exists')

    const { count: ownItems, error: oiErr } = await admin
      .from('queue_items')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', ownQueueId)
    if (oiErr) throw new Error(oiErr.message)
    console.log('deleter queue_items count:', ownItems, '(expect 0)')
    assert((ownItems ?? 0) === 0, 'deleter queue_items remain')

    const otherQ = await countEq('queues', 'id', otherQueueId)
    console.log('other queue count:', otherQ, '(expect 1 — queue itself kept)')
    assert(otherQ === 1, 'other queue should survive')

    const { count: otherItems, error: oqiErr } = await admin
      .from('queue_items')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', otherQueueId)
      .eq('song_id', songId)
    if (oqiErr) throw new Error(oqiErr.message)
    console.log('other queue_items still pointing at deleted song:', otherItems, '(expect 0 — CASCADE)')
    assert((otherItems ?? 0) === 0, 'other queue_item should CASCADE-delete with song')

    const { count: otherItemsAny, error: oqaErr } = await admin
      .from('queue_items')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', otherQueueId)
    if (oqaErr) throw new Error(oqaErr.message)
    console.log('other queue_items remaining (any):', otherItemsAny, '(expect 0)')
    assert((otherItemsAny ?? 0) === 0, 'other queue still has items')
  }

  console.log('--- end linked-song assertions ---\n')

  assert((await countEq('profiles', 'id', userId)) === 0, 'profile still exists')
  assert((await countEq('posts', 'author_profile_id', userId)) === 0, 'posts remain')
  assert((await countEq('songs', 'owner_profile_id', userId)) === 0, 'songs remain')

  // Cleanup other user + survivor post so we do not litter the project
  await admin.from('posts').delete().eq('id', survivorPostId)
  if (otherQueueId) {
    await admin.from('queue_items').delete().eq('queue_id', otherQueueId)
    await admin.from('queues').delete().eq('id', otherQueueId)
  }
  await admin.from('profiles').delete().eq('id', otherId)
  await admin.auth.admin.deleteUser(otherId)

  console.log('PASS — linked-song case: song gone, owned post gone, survivor song_id=null, queue_items cascaded.')
  console.log('Spot-check deleted userId (should be absent):', userId)
}

main().catch((err) => {
  console.error('\nFAIL —', err.message || err)
  process.exit(1)
})
