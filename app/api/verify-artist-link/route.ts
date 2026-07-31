import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Only Suno is verifiable right now — widen this list only after
// confirming a given platform reliably renders bio text in server HTML
// (some platforms hydrate bios client-side via JS, which a plain fetch
// can't see).
const ALLOWED_HOSTS = ['suno.com', 'www.suno.com']

export async function POST(req: NextRequest) {
  let body: { url?: string; code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ verified: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { url, code } = body
  if (!url || !code) {
    return NextResponse.json({ verified: false, error: 'Missing url or code.' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ verified: false, error: 'Not a valid URL.' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ verified: false, error: 'Only Suno profile links are supported right now.' }, { status: 400 })
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MargoVerifyBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return NextResponse.json({ verified: false, error: `Could not load that profile (status ${res.status}).` })
    }
    const html = await res.text()

    // NOTE: checks raw server-rendered HTML for the code. If Suno renders
    // the bio client-side, this false-negatives even when the code is
    // genuinely there — needs a live test against a real profile before
    // this is trusted. A false negative here just routes the applicant
    // to manual review, not a broken approval — safe failure mode.
    const found = html.includes(code)
    return NextResponse.json({ verified: found })
  } catch {
    return NextResponse.json({ verified: false, error: 'Could not reach that profile. Check the link and try again.' })
  }
}