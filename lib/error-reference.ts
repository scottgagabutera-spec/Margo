/** Small grey reference line on global / pane error surfaces (Next digest or fallback). */
export function errorReferenceLine(error: { digest?: string; message?: string } | null | undefined): string | null {
  if (!error) return null
  const digest = error.digest?.trim()
  if (digest) return digest
  const msg = error.message?.trim()
  if (msg) {
    if (/^Cannot read /i.test(msg) || /^undefined is not/i.test(msg)) return 'runtime-error'
    return msg.slice(0, 12)
  }
  return null
}
