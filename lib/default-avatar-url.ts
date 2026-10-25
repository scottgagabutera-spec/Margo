/**
 * @deprecated External avatar URLs removed — use {@link portraitFallbackFromSeed} in-app.
 */
export function defaultAvatarUrlForSeed(_seed: string): null {
  return null
}

export function isDefaultAvatarUrl(_url: string | null | undefined): boolean {
  return false
}
