/**
 * Normalizes whatever an artist types into the Suno Profile field into a
 * full https://suno.com/@handle URL. People naturally type just their
 * handle ("trymargo"), their handle with the @ ("@trymargo"), or the
 * domain without a protocol ("suno.com/@trymargo") — requiring the full
 * URL up front was unnecessary friction. This is intentionally forgiving:
 * anything that already looks like a full http(s) URL is passed through
 * unchanged (still validated downstream by `new URL()` and the hostname
 * allowlist), and anything else is treated as a bare handle.
 *
 * Shared between the client form and the server routes so both apply the
 * exact same rule — normalizing only in the browser would let a direct
 * API call with a bare handle slip through as "Not a valid URL."
 */
export function normalizeSunoUrl(input: string): string {
  let value = input.trim()
  if (!value) return value

  // Already a full URL — leave it alone. Downstream code still validates
  // this with `new URL()` and checks the hostname is actually suno.com.
  if (/^https?:\/\//i.test(value)) return value

  // Someone pasted "suno.com/@handle" or "www.suno.com/@handle" without
  // a protocol — strip the domain so we can rebuild it consistently.
  value = value.replace(/^(www\.)?suno\.com\//i, '')

  // Strip a leading @ so re-adding it below is consistent either way.
  value = value.replace(/^@/, '')

  if (!value) return 'https://suno.com/'

  return `https://suno.com/@${value}`
}