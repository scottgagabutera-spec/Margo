'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { encodeSpikeMomentMp4 } from '@/lib/moment-export/spike/encode-spike-mp4'
import { SPIKE_MOMENT } from '@/lib/moment-export/spike/spike-moment'
import {
  canShareVideoFiles,
  probeWebCodecsCapabilities,
  type WebCodecsCapabilityReport,
} from '@/lib/moment-export/spike/webcodecs-capabilities'
import type { EncodeSpikeResult } from '@/lib/moment-export/spike/encode-spike-mp4'

const font = 'var(--font-lora), serif'

export default function MomentVideoSpikePage() {
  const [autoDuration, setAutoDuration] = useState<number | undefined>(undefined)
  const [autoRun, setAutoRun] = useState(false)
  const [caps, setCaps] = useState<WebCodecsCapabilityReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EncodeSpikeResult | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    void probeWebCodecsCapabilities().then(setCaps)
    setCanShare(canShareVideoFiles())
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const d = Number(params.get('duration') || '')
      if (d > 0) setAutoDuration(d)
      setAutoRun(params.get('autorun') === '1')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const runEncode = useCallback(async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
    try {
      const encoded = await encodeSpikeMomentMp4(
        SPIKE_MOMENT,
        (p) => {
          if (p.phase === 'audio') setProgress('Fetching & decoding audio…')
          else if (p.phase === 'frames') setProgress(`Rendering frame ${p.frame ?? 0} / ${p.frameCount ?? '?'}`)
          else setProgress('Muxing MP4…')
        },
        autoDuration ? { durationSec: autoDuration } : undefined,
      )
      setResult(encoded)
      const url = URL.createObjectURL(encoded.blob)
      setVideoUrl(url)
      setProgress('Done')
    } catch (e) {
      setError((e as Error).message || 'Encode failed')
      setProgress('')
    } finally {
      setBusy(false)
    }
  }, [videoUrl, autoDuration])

  useEffect(() => {
    if (autoRun && caps?.videoEncoder && caps?.audioEncoder && !busy && !result) {
      void runEncode()
    }
  }, [autoRun, caps, busy, result, runEncode])

  const download = useCallback(() => {
    if (!result) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(result.blob)
    a.download = 'MARGO_Moment_Spike.mp4'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }, [result])

  const share = useCallback(async () => {
    if (!result || !navigator.share) return
    const file = new File([result.blob], 'MARGO_Moment_Spike.mp4', { type: 'video/mp4' })
    try {
      await navigator.share({ files: [file], title: 'MARGO Moment' })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message)
      }
    }
  }, [result])

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      padding: '24px 20px 48px',
      maxWidth: '720px',
      margin: '0 auto',
    }}>
      <p style={{
        fontFamily: font,
        fontSize: '0.62rem',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        marginBottom: '8px',
      }}>
        Dev spike — not production
      </p>
      <h1 style={{
        fontFamily: font,
        fontStyle: 'italic',
        fontSize: '1.35rem',
        margin: '0 0 8px',
      }}>
        Moment video export proof
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
        Hard-coded single-line Moment → Canvas frames → WebCodecs → Mediabunny MP4.
        Does not touch production PNG export.
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Hard-coded Moment</h2>
        <pre style={preStyle}>{JSON.stringify(SPIKE_MOMENT, null, 2)}</pre>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>WebCodecs capabilities</h2>
        {caps ? (
          <pre style={preStyle}>{JSON.stringify(caps, null, 2)}</pre>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Probing…</p>
        )}
      </section>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => { void runEncode() }}
          disabled={busy || !caps?.videoEncoder || !caps?.audioEncoder}
          style={primaryBtn}
        >
          {busy ? 'Encoding…' : 'Generate MP4'}
        </button>
        {result ? (
          <>
            <button type="button" onClick={download} style={secondaryBtn}>Download</button>
            {canShare ? (
              <button type="button" onClick={() => { void share() }} style={secondaryBtn}>Share file</button>
            ) : null}
          </>
        ) : null}
      </div>

      {progress ? <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{progress}</p> : null}
      {error ? <p style={{ fontSize: '0.75rem', color: '#e88' }}>{error}</p> : null}

      {result ? (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Encode result</h2>
          <pre style={preStyle}>{JSON.stringify({
            durationSec: result.durationSec,
            frameCount: result.frameCount,
            fileSizeBytes: result.fileSizeBytes,
            fileSizeKB: Math.round(result.fileSizeBytes / 1024),
            encodeMs: Math.round(result.encodeMs),
            audioFetchMs: Math.round(result.audioFetchMs),
            frameRenderMs: Math.round(result.frameRenderMs),
            muxMs: Math.round(result.muxMs),
            videoCodec: result.videoCodec,
            audioCodec: result.audioCodec,
          }, null, 2)}</pre>
        </section>
      ) : null}

      {videoUrl ? (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Preview</h2>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            style={{
              width: '100%',
              maxWidth: '360px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              display: 'block',
            }}
          />
        </section>
      ) : null}
    </main>
  )
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '20px',
  padding: '14px',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'rgba(255,255,255,0.02)',
}

const h2Style: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  margin: '0 0 10px',
}

const preStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.68rem',
  lineHeight: 1.45,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: 'var(--text-secondary)',
}

const primaryBtn: React.CSSProperties = {
  minHeight: 'var(--margo-touch-min)',
  padding: '0 20px',
  borderRadius: '50px',
  border: 'none',
  background: 'var(--gold)',
  color: '#07060A',
  fontWeight: 700,
  fontSize: '0.78rem',
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  minHeight: 'var(--margo-touch-min)',
  padding: '0 16px',
  borderRadius: '50px',
  border: '1px solid var(--border-hi)',
  background: 'transparent',
  color: 'var(--text)',
  fontWeight: 600,
  fontSize: '0.78rem',
  cursor: 'pointer',
}
