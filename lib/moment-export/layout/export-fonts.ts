export function resolveGeistFontFamily(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim()
  return v ? `${v}, sans-serif` : 'system-ui, sans-serif'
}

export async function waitForExportFonts(): Promise<void> {
  if (typeof document === 'undefined') return
  try {
    await document.fonts.ready
  } catch {
    /* ignore */
  }
}
