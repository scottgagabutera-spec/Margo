import assert from 'node:assert/strict'
import test from 'node:test'
import { runStageSongSearch } from './stage-song-search-run.ts'

test('Margo hits publish before slow external fetch completes', async () => {
  let gen = 1
  const seen: string[] = []
  const started = Date.now()
  await runStageSongSearch({
    query: 'test',
    generation: 1,
    currentGeneration: () => gen,
    fetchMargo: async () => {
      await delay(20)
      return [{ id: 'm1', title: 'Margo Song', artist: 'Artist', artwork: '' }]
    },
    fetchExternal: async () => {
      await delay(3000)
      return [{ id: 'e1', title: 'Slow', artist: 'X', artwork: '', source: 'genius' }]
    },
    songMatchKey: (t, a) => `${t}|${a}`,
    onLoading: (v) => seen.push(v ? 'loading' : 'idle'),
    onResults: (rows) => seen.push(`results:${rows.map((r) => r.id).join(',')}`),
  })
  assert.ok(Date.now() - started < 500, 'should not wait for 3s external')
  assert.match(seen.join('|'), /results:m1/)
  assert.match(seen.join('|'), /results:m1,e1|results:m1/)
})

test('stale generation skips publishing external results', async () => {
  let gen = 2
  const published: string[] = []
  const p = runStageSongSearch({
    query: 'x',
    generation: 1,
    currentGeneration: () => gen,
    fetchMargo: async () => [],
    fetchExternal: async () => {
      await delay(30)
      return [{ id: 'e1', title: 'Ext', artist: 'Y', artwork: '', source: 'apple' }]
    },
    songMatchKey: (t, a) => `${t}|${a}`,
    onLoading: () => {},
    onResults: (rows) => published.push(rows.map((r) => r.id).join(',')),
  })
  gen = 2
  await p
  assert.deepEqual(published, [])
})

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
