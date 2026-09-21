import { NextRequest, NextResponse } from 'next/server'
import { assertSongPipelineAccess } from '@/lib/song-pipeline-auth'
import { resolveWhisperLanguage, whisperLanguageName } from '@/lib/whisper-language'

export const runtime = 'nodejs'
export const maxDuration = 300

function whisperErrorDetail(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function isLanguageRejected(detail: unknown): boolean {
  const text = typeof detail === 'string'
    ? detail
    : JSON.stringify(detail ?? '')
  return /language/i.test(text) && /invalid|unsupported|not found|unknown/i.test(text)
}

async function transcribeWithWhisper(
  audioBlob: Blob,
  filename: string,
  language: string | undefined,
  prompt: string | undefined,
): Promise<{ ok: true; srt: string } | { ok: false; status: number; detail: unknown }> {
  const formData = new FormData()
  formData.append('file', audioBlob, filename)
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'srt')
  if (language) formData.append('language', language)
  if (prompt) formData.append('prompt', prompt)

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  })

  if (!whisperRes.ok) {
    const errText = await whisperRes.text()
    return { ok: false, status: whisperRes.status, detail: whisperErrorDetail(errText) }
  }

  const srt = await whisperRes.text()
  return { ok: true, srt }
}

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, songId, language, prompt } = await request.json()
    if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

    const gate = await assertSongPipelineAccess(typeof songId === 'string' ? songId : null)
    if (!gate.ok) return gate.res

    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch audio file (${audioRes.status})` },
        { status: 400 },
      )
    }
    const audioBuffer = await audioRes.arrayBuffer()
    const urlLower = String(audioUrl).toLowerCase()
    const mimeType = urlLower.includes('.mp3') ? 'audio/mpeg' : urlLower.includes('.m4a') ? 'audio/mp4' : urlLower.includes('.ogg') ? 'audio/ogg' : 'audio/wav'
    const ext = urlLower.includes('.mp3') ? 'audio.mp3' : urlLower.includes('.m4a') ? 'audio.m4a' : urlLower.includes('.ogg') ? 'audio.ogg' : 'audio.wav'
    const audioBlob = new Blob([audioBuffer], { type: mimeType })

    const resolved = resolveWhisperLanguage(typeof language === 'string' ? language : undefined)
    const artistPrompt = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : ''
    const combinedPrompt = [resolved.promptPrefix, artistPrompt].filter(Boolean).join(' ')
    const promptValue = combinedPrompt || undefined

    let result = await transcribeWithWhisper(audioBlob, ext, resolved.apiLanguage, promptValue)

    // Whisper-1 rejects codes it has no token for (Zulu `zu`, Xhosa `xh`, …).
    // Retry once with auto-detect + the language name in the prompt.
    if (!result.ok && resolved.apiLanguage && isLanguageRejected(result.detail)) {
      const name = whisperLanguageName(resolved.apiLanguage) || resolved.apiLanguage
      const retryPrompt = [
        `This song is in ${name}. Transcribe the lyrics faithfully.`,
        artistPrompt,
      ].filter(Boolean).join(' ')
      result = await transcribeWithWhisper(audioBlob, ext, undefined, retryPrompt || undefined)
    }

    if (!result.ok) {
      return NextResponse.json({ error: 'Whisper failed', detail: result.detail }, { status: 500 })
    }

    if (!result.srt.trim()) {
      return NextResponse.json({ error: 'Whisper returned no lyrics. Try auto-detect or add a lyric hint.' }, { status: 500 })
    }

    return NextResponse.json({ srt: result.srt, songId })
  } catch (err: any) {
    return NextResponse.json({ error: 'Whisper failed', detail: err.message }, { status: 500 })
  }
}
