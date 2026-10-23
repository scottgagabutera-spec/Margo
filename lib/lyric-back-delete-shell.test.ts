import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  applyEchoContentRemoved,
  assertShellRowDbClean,
} from './post-content-removed.ts'

const MIGRATION = 'supabase/migrations/20261023180000_lyric_back_delete_shell.sql'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

describe('lyric back delete shell migration', () => {
  it('adds content_removed_at and service_role-only RPC with race re-check', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8')
    assert.match(sql, /content_removed_at timestamptz/)
    assert.match(sql, /delete_or_shell_own_lyric_back/)
    assert.match(sql, /revoke all on function public\.delete_or_shell_own_lyric_back/)
    assert.match(sql, /grant execute on function public\.delete_or_shell_own_lyric_back.*to service_role/)
    assert.match(sql, /Re-check under row lock/)
    assert.match(sql, /text = ''/)
    assert.match(sql, /song_id = null/)
    assert.doesNotMatch(sql, /can_read_sent_moment/)
  })

  it('shell clear author migration extends author_or_legacy check', () => {
    const sql = fs.readFileSync(
      'supabase/migrations/20261023200000_shell_clear_author.sql',
      'utf8',
    )
    assert.match(sql, /content_removed_at is not null/)
    assert.match(sql, /author_profile_id is not null/)
    assert.match(sql, /legacy_author_label is not null/)
    assert.match(sql, /author_profile_id = null/)
    assert.doesNotMatch(sql, /can_read_sent_moment/)
    assert.doesNotMatch(sql, /create policy/i)
    assert.doesNotMatch(sql, /^grant /im)
  })
})

describe('applyEchoContentRemoved', () => {
  it('strips lyric, track, snippet, and author fields when shelled', () => {
    const out = applyEchoContentRemoved({
      id: 'x',
      lyric: 'secret',
      song: 'Song',
      artist: 'Artist',
      emotion: 'melancholy',
      username: 'u',
      displayName: 'U',
      authorUid: 'uid',
      authorAvatarUrl: 'https://x/a.png',
      songId: 's',
      audioUrl: 'https://x/t.mp3',
      artwork: 'https://x/art.png',
      contentRemovedAt: '2026-01-01T00:00:00Z',
    })
    assert.equal(out.lyric, '')
    assert.equal(out.song, '')
    assert.equal(out.authorUid, undefined)
    assert.equal(out.audioUrl, null)
  })
})

describe('delete_or_shell_own_lyric_back [verified live]', () => {
  it('hard-deletes when no children; shells when children exist; race re-check shells', async (t) => {
    const admin = adminClient()
    if (!admin) {
      t.skip('missing Supabase env')
      return
    }

    const { error: probeErr } = await admin.rpc('delete_or_shell_own_lyric_back', {
      p_post_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '00000000-0000-0000-0000-000000000000',
    })
    if (probeErr && /42883|does not exist/i.test(`${probeErr.message || ''} ${probeErr.code || ''}`)) {
      t.skip('RPC not deployed on linked project')
      return
    }

    const { data: ownerRow, error: ownerErr } = await admin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()
    if (ownerErr || !ownerRow?.id) {
      t.skip('no profiles row for fixture')
      return
    }
    const ownerId = ownerRow.id as string

    const mkMoment = async () => {
      const { data, error } = await admin
        .from('posts')
        .insert({
          text: 'Root moment',
          emotion: 'joy',
          status: 'active',
          song_title: 'T',
          artist_name: 'A',
          author_profile_id: ownerId,
          parent_post_id: null,
        })
        .select('id')
        .single()
      assert.ifError(error)
      return data!.id as string
    }

    const mkLb = async (parentId: string, tag: string) => {
      const { data, error } = await admin
        .from('posts')
        .insert({
          text: `LB ${tag}`,
          emotion: 'joy',
          status: 'active',
          song_title: 'Song',
          artist_name: 'Artist',
          artwork_url: 'https://example.com/a.jpg',
          song_id: null,
          snippet_start_sec: 1,
          snippet_end_sec: 5,
          external_listen_url: 'https://example.com/listen',
          author_profile_id: ownerId,
          parent_post_id: parentId,
        })
        .select('id')
        .single()
      assert.ifError(error)
      return data!.id as string
    }

    const rootId = await mkMoment()
    const leafId = await mkLb(rootId, 'leaf')

    const { data: delOut, error: delErr } = await admin.rpc('delete_or_shell_own_lyric_back', {
      p_post_id: leafId,
      p_user_id: ownerId,
    })
    assert.ifError(delErr)
    assert.equal((delOut as { outcome?: string }).outcome, 'deleted')
    const { data: gone } = await admin.from('posts').select('id').eq('id', leafId).maybeSingle()
    assert.equal(gone, null)

    const parentId = await mkLb(rootId, 'parent')
    const childId = await mkLb(parentId, 'child')

    const { data: shellOut, error: shellErr } = await admin.rpc('delete_or_shell_own_lyric_back', {
      p_post_id: parentId,
      p_user_id: ownerId,
    })
    assert.ifError(shellErr)
    assert.equal((shellOut as { outcome?: string }).outcome, 'shelled')

    const { data: shellRow, error: shellRowErr } = await admin
      .from('posts')
      .select('*')
      .eq('id', parentId)
      .single()
    assert.ifError(shellRowErr)
    assertShellRowDbClean(shellRow as Record<string, unknown>)

    const { data: childStill } = await admin.from('posts').select('id, parent_post_id').eq('id', childId).single()
    assert.equal(childStill?.parent_post_id, parentId)

    const raceRoot = await mkMoment()
    const raceParent = await mkLb(raceRoot, 'race-parent')
    await mkLb(raceParent, 'race-child')

    const { data: raceOut } = await admin.rpc('delete_or_shell_own_lyric_back', {
      p_post_id: raceParent,
      p_user_id: ownerId,
    })
    assert.equal((raceOut as { outcome?: string }).outcome, 'shelled')

    await admin.from('posts').delete().eq('id', childId)
    await admin.from('posts').delete().eq('id', parentId)
    await admin.from('posts').delete().eq('id', raceParent)
    await admin.from('posts').delete().in('id', [rootId, raceRoot])
  })
})
