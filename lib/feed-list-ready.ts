/** Pure feed empty-state gate — used by Feed and unit tests for new accounts. */
export function feedListReady(seeded: boolean, postCount: number, loading: boolean): boolean {
  return seeded && (postCount > 0 || !loading)
}

/** You-tab keepalive must not mount Profile until identity is stable (post-welcome). */
export function canMountYouKeepalivePane(input: {
  signedIn: boolean
  identityLoading: boolean
  username: string | null | undefined
}): boolean {
  return input.signedIn && !input.identityLoading && !!input.username?.trim()
}
