import { canMountYouKeepalivePane, feedListReady } from './feed-list-ready.ts'
import { shouldMountAppContent } from './consent-first-shell.ts'
import { needsOnboarding } from './welcome-needs-onboarding.ts'
import { oauthCallbackClientReturnTo } from './oauth-callback-navigation.ts'

export type ShellMatrixStateId = 'A' | 'B' | 'C' | 'D' | 'E'

export type ShellMatrixState = {
  id: ShellMatrixStateId
  signedIn: boolean
  identityLoading: boolean
  identity: { username: string; displayName: string } | null
  profileReadStatus: 'ok' | 'error' | 'loading'
  settings: Record<string, unknown> | null
  authUserCreatedAt: string | null
  needsTermsAcceptance: boolean
  pathname: string
  step: string | null
  oauthServerRedirect?: string | null
}

export class ShellRenderError extends Error {
  stateId: ShellMatrixStateId
  surface: 'app' | 'feed' | 'you' | 'oauth'

  constructor(
    stateId: ShellMatrixStateId,
    surface: 'app' | 'feed' | 'you' | 'oauth',
    message: string,
  ) {
    super(`[${stateId}/${surface}] ${message}`)
    this.name = 'ShellRenderError'
    this.stateId = stateId
    this.surface = surface
  }
}

/** App shell: mounting product UI without consent must throw (test documents the failure mode). */
export function assertAppShellMount(state: ShellMatrixState): void {
  const mount = shouldMountAppContent({
    signedIn: state.signedIn,
    needsTermsAcceptance: state.needsTermsAcceptance,
    pathname: state.pathname,
    step: state.step,
  })
  if (!mount && state.pathname === '/feed') {
    throw new ShellRenderError(
      state.id,
      'app',
      'Feed route mounted while terms acceptance required',
    )
  }
}

export function assertFeedPaneRender(state: ShellMatrixState): void {
  assertAppShellMount(state)
  if (!shouldMountAppContent({
    signedIn: state.signedIn,
    needsTermsAcceptance: state.needsTermsAcceptance,
    pathname: state.pathname,
    step: state.step,
  })) {
    return
  }
  feedListReady(
    !state.identityLoading,
    0,
    state.identityLoading,
  )
}

export function assertYouPaneRender(state: ShellMatrixState): void {
  assertAppShellMount(state)
  if (!shouldMountAppContent({
    signedIn: state.signedIn,
    needsTermsAcceptance: state.needsTermsAcceptance,
    pathname: state.pathname,
    step: state.step,
  })) {
    return
  }
  canMountYouKeepalivePane({
    signedIn: state.signedIn,
    identityLoading: state.identityLoading,
    username: state.identity?.username,
  })
}

export function assertOAuthCallbackNavigation(state: ShellMatrixState): void {
  if (!state.oauthServerRedirect) return
  const follow = oauthCallbackClientReturnTo(state.oauthServerRedirect)
  if (
    state.needsTermsAcceptance
    && state.oauthServerRedirect.includes('step=terms')
    && follow.kind !== 'terms'
  ) {
    throw new ShellRenderError(
      state.id,
      'oauth',
      'OAuth terms redirect was stripped — client would wrongly open /feed',
    )
  }
}

export function matrixStates(): ShellMatrixState[] {
  const base = {
    signedIn: true,
    pathname: '/feed',
    step: null as string | null,
    oauthServerRedirect: null as string | null,
  }
  return [
    {
      id: 'A',
      ...base,
      identityLoading: true,
      identity: null,
      profileReadStatus: 'loading',
      settings: null,
      authUserCreatedAt: null,
      needsTermsAcceptance: false,
    },
    {
      id: 'B',
      ...base,
      identityLoading: false,
      identity: null,
      profileReadStatus: 'ok',
      settings: null,
      authUserCreatedAt: '2026-10-27T00:00:00.000Z',
      needsTermsAcceptance: false,
    },
    {
      id: 'C',
      ...base,
      identityLoading: false,
      identity: { username: 'member123', displayName: 'member123' },
      profileReadStatus: 'ok',
      settings: null,
      authUserCreatedAt: '2026-10-27T00:00:00.000Z',
      needsTermsAcceptance: true,
      oauthServerRedirect: '/signin?step=terms',
    },
    {
      id: 'D',
      ...base,
      identityLoading: false,
      identity: { username: 'member123', displayName: 'Rip' },
      profileReadStatus: 'ok',
      settings: { legal: { termsAcceptedAt: '2026-10-26T00:00:00.000Z', termsVersion: '1' } },
      authUserCreatedAt: '2026-10-27T00:00:00.000Z',
      needsTermsAcceptance: false,
    },
    {
      id: 'E',
      ...base,
      identityLoading: false,
      identity: { username: 'rip', displayName: 'Rip' },
      profileReadStatus: 'ok',
      settings: { onboarding: { completedAt: '2026-10-26T12:00:00.000Z' } },
      authUserCreatedAt: '2026-10-27T00:00:00.000Z',
      needsTermsAcceptance: false,
    },
  ]
}

export function needsOnboardingForMatrixState(state: ShellMatrixState): boolean {
  if (state.profileReadStatus !== 'ok' || !state.identity) return false
  return needsOnboarding({
    identity: state.identity,
    settings: state.settings,
    profileReadOk: true,
    authUserCreatedAt: state.authUserCreatedAt,
  })
}
