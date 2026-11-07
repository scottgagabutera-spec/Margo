/** Short git SHA for preview deployments (Hub footer). */
export function previewBuildShortSha(): string | null {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return null
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim()
  if (!sha) return null
  return sha.slice(0, 7)
}
