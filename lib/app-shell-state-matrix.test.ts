import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertAppShellMount,
  assertFeedPaneRender,
  assertOAuthCallbackNavigation,
  assertYouPaneRender,
  matrixStates,
  needsOnboardingForMatrixState,
  ShellRenderError,
} from './app-shell-state-matrix.ts'
import { shouldMountAppContent } from './consent-first-shell.ts'

for (const state of matrixStates()) {
  test(`app shell state ${state.id} does not throw on feed/you/oauth rules`, () => {
    if (state.id === 'C') {
      assert.throws(
        () => assertAppShellMount(state),
        (err: unknown) => err instanceof ShellRenderError
          && err.message.includes('Feed route mounted while terms'),
      )
      assert.doesNotThrow(() => assertOAuthCallbackNavigation(state))
      return
    }
    assert.doesNotThrow(() => assertAppShellMount(state))
    assert.doesNotThrow(() => assertFeedPaneRender(state))
    assert.doesNotThrow(() => assertYouPaneRender(state))
    assert.doesNotThrow(() => assertOAuthCallbackNavigation(state))
  })
}

test('state C: consent gate blocks app mount until terms screen', () => {
  assert.equal(
    shouldMountAppContent({
      signedIn: true,
      needsTermsAcceptance: true,
      pathname: '/feed',
      step: null,
    }),
    false,
  )
  assert.equal(
    shouldMountAppContent({
      signedIn: true,
      needsTermsAcceptance: true,
      pathname: '/signin',
      step: 'terms',
    }),
    true,
  )
})

test('state D: new Google account needs welcome after consent', () => {
  const d = matrixStates().find((s) => s.id === 'D')!
  assert.equal(needsOnboardingForMatrixState(d), true)
})

test('state E: completed onboarding skips welcome', () => {
  const e = matrixStates().find((s) => s.id === 'E')!
  assert.equal(needsOnboardingForMatrixState(e), false)
})
