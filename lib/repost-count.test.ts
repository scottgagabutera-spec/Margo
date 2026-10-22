import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  REPLAYED_STORAGE_KEY,
  endReplayWrite,
  isUniqueViolation,
  applyLoadedMembership,
  mergeLoadedReplays,
  pendingAfterServer,
  reconcileReplayPending,
  tryBeginReplayWrite,
  visibleReplayCount,
  type ReplayCountPending,
} from './repost-count.ts'

function pending(partial: Partial<ReplayCountPending> & Pick<ReplayCountPending, 'base' | 'delta'>): ReplayCountPending {
  return { settled: false, gen: 1, ...partial }
}

describe('repost badge count', () => {
  it('shows the optimistic count ahead of a stale server snapshot', () => {
    const row = pending({ base: 4, delta: 1, settled: true })
    assert.equal(visibleReplayCount(4, row, 0), 5)
    assert.equal(pendingAfterServer(row, 4)?.base, 4)
  })

  it('drops the override once the server catches up, including a higher count', () => {
    const row = pending({ base: 4, delta: 1, settled: true })
    assert.equal(pendingAfterServer(row, 5), undefined)
    assert.equal(pendingAfterServer(row, 7), undefined)
    assert.equal(visibleReplayCount(7, undefined, 0), 7)
  })

  it('keeps an in-flight badge when a stale snapshot arrives', () => {
    const row = pending({ base: 2, delta: -1, settled: false })
    assert.equal(visibleReplayCount(2, row, 0), 1)
    assert.equal(pendingAfterServer(row, 2), row)
  })

  it('clears a delete once the server is at or below the expected count', () => {
    const row = pending({ base: 6, delta: -1, settled: true })
    assert.equal(pendingAfterServer(row, 5), undefined)
    assert.equal(pendingAfterServer(row, 4), undefined)
    assert.ok(pendingAfterServer(row, 6))
  })

  it('reconciles only the posts whose server count caught up', () => {
    const open = pending({ base: 1, delta: 1, settled: false, gen: 2 })
    const done = pending({ base: 3, delta: 1, settled: true, gen: 3 })
    const next = reconcileReplayPending(
      { a: open, b: done },
      { a: 1, b: 4 },
    )
    assert.equal(next.a, open)
    assert.equal(next.b, undefined)
  })
})

describe('repost in-flight lock', () => {
  it('rejects a second write for the same post until the first ends', () => {
    const inFlight = new Map()
    assert.equal(tryBeginReplayWrite(inFlight, 'p1', 'insert'), true)
    assert.equal(tryBeginReplayWrite(inFlight, 'p1', 'insert'), false)
    assert.equal(tryBeginReplayWrite(inFlight, 'p2', 'delete'), true)
    endReplayWrite(inFlight, 'p1')
    assert.equal(tryBeginReplayWrite(inFlight, 'p1', 'delete'), true)
  })

  it('keeps an in-flight insert and drops an in-flight delete when a reload lands', () => {
    const inFlight = new Map<string, 'insert' | 'delete' | 'quote'>([
      ['adding', 'insert'],
      ['removing', 'delete'],
      ['noting', 'quote'],
    ])
    const merged = mergeLoadedReplays(['removing', 'older'], inFlight)
    assert.equal(merged.has('adding'), true)
    assert.equal(merged.has('noting'), true)
    assert.equal(merged.has('removing'), false)
    assert.equal(merged.has('older'), true)
  })

  it('keeps a repost that landed while a select was in flight', () => {
    const decided = new Map([['new-id', 200]])
    const current = new Set(['new-id', 'older'])
    const { ids, dropDecided } = applyLoadedMembership(
      ['older'],
      new Map(),
      decided,
      current,
      100,
    )
    assert.equal(ids.has('new-id'), true)
    assert.equal(ids.has('older'), true)
    assert.deepEqual(dropDecided, [])
  })

  it('trusts a select that started after the local decision', () => {
    const { ids, dropDecided } = applyLoadedMembership(
      ['older'],
      new Map(),
      new Map([['new-id', 50]]),
      new Set(['new-id', 'older']),
      100,
    )
    assert.equal(ids.has('new-id'), false)
    assert.deepEqual(dropDecided, ['new-id'])
  })

  it('recognises the postgres unique violation', () => {
    assert.equal(isUniqueViolation({ code: '23505' }), true)
    assert.equal(isUniqueViolation({ code: '42501' }), false)
    assert.equal(isUniqueViolation(null), false)
  })
})

describe('repost copy stays user-facing and leaves storage names alone', () => {
  const read = (path: string) => fs.readFileSync(path, 'utf8')

  it('keeps the localStorage key', () => {
    assert.equal(REPLAYED_STORAGE_KEY, 'margoReplayed')
  })

  it('says Reposted by on the feed card and Repost on the action', () => {
    const attribution = read('components/replay-attribution.tsx')
    const actions = read('components/feed-post-actions.tsx')
    assert.match(attribution, /Reposted by/)
    assert.equal(attribution.includes('Replayed by'), false)
    assert.match(actions, />Repost</)
    assert.equal(actions.includes('Undo Replay'), false)
    assert.equal(actions.includes('>Replay<'), false)
  })

  it('still writes post_replays and does not notify', () => {
    const hook = read('hooks/usePostReplays.ts')
    assert.match(hook, /from\('post_replays'\)/)
    assert.match(hook, /replayer_id/)
    assert.match(hook, /quote_text/)
    assert.match(hook, /margoReplayed/)
    assert.equal(hook.includes("from('notifications')"), false)
    assert.equal(hook.includes('lyric_back'), false)
  })

  it('leaves the karaoke Loop control on ReplayIcon', () => {
    const karaoke = read('components/karaoke-up-next.tsx')
    assert.match(karaoke, /ReplayIcon/)
    assert.match(karaoke, />\s*Loop\s*</)
  })
})
