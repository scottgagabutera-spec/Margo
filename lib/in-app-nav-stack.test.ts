import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  canPopNavStack,
  navStackPreviousPath,
  recordNavPush,
  recordNavReplace,
  recordNavPop,
  resetNavStack,
  markNextNavAsReplace,
  consumeNextNavAsReplace,
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

describe('in-app nav stack', () => {
  it('tracks push and pop', () => {
    resetNavStack('/feed')
    recordNavPush('/post/a')
    recordNavPush('/post/b')
    assert.equal(navStackPreviousPath(), '/post/a')
    assert.equal(canPopNavStack(), true)
    recordNavPop()
    assert.equal(navStackPreviousPath(), '/feed')
  })

  it('replace updates top without growing', () => {
    resetNavStack('/feed')
    recordNavPush('/post/a')
    recordNavReplace('/post/b')
    assert.equal(navStackPreviousPath(), '/feed')
    recordNavPush('/post/c')
    assert.equal(navStackPreviousPath(), '/post/b')
  })

  it('markNextNavAsReplace is consumed once', () => {
    markNextNavAsReplace()
    assert.equal(consumeNextNavAsReplace(), true)
    assert.equal(consumeNextNavAsReplace(), false)
  })
})
