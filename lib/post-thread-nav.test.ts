import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  canPopNavStack,
  navStackPreviousPath,
  recordNavPush,
  resetNavStack,
} from './in-app-nav-stack.ts'

const STACK_KEY = 'margo:inAppNavStack'

beforeEach(() => {
  const store = new Map<string, string>()
  const mock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: () => null,
    length: 0,
  } as Storage
  ;(globalThis as { sessionStorage?: Storage }).sessionStorage = mock
  mock.removeItem(STACK_KEY)
})

describe('post thread nav stack (push, not replace on open)', () => {
  it('feed → post push keeps feed as previous path', () => {
    resetNavStack('/feed')
    recordNavPush('/post/abc')
    assert.equal(navStackPreviousPath(), '/feed')
    assert.equal(canPopNavStack(), true)
  })

  it('replace-on-open would drop feed (regression guard)', () => {
    resetNavStack('/feed')
    const s = ['/feed']
    s[s.length - 1] = '/post/abc'
    assert.equal(s.length, 1)
    assert.equal(navStackPreviousPath(), null)
  })
})
