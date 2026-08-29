'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { normalizeArtistCreditForSave } from '@/lib/artist-identity'
import {
  ATMOSPHERE_OPTIONS,
  parseAtmosphere,
  toAtmosphereColumn,
  type AtmosphereId,
} from '@/lib/atmosphere'

const supabase = createClient()

const font = 'var(--font-lora), serif'

interface SongUploadFormProps {
  artistDisplayName: string
  artistUsername?: string | null
  onComplete: () => void
  onCancel: () => void
  /** When set, the form updates this songs.id instead of inserting a new row. */
  songId?: string | null
}

interface LoadedLine {
  line_index: number
  text: string
  start_sec: number
  end_sec: number
}

type Stage =
  | 'idle'
  | 'uploading-audio'
  | 'uploading-artwork'
  | 'saving-song'
  | 'transcribing'
  | 'tagging'
  | 'publishing'
  | 'done'
  | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: '10px', color: 'var(--text)',
  fontFamily: font, fontSize: '1rem',
  outline: 'none', boxSizing: 'border-box', minHeight: '44px',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: font,
  fontSize: '0.6rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px',
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 14V3M11 3L6.5 7.5M11 3l4.5 4.5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 15v2.5A1.5 1.5 0 0 0 5 19h12a1.5 1.5 0 0 0 1.5-1.5V15" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AiGeneratedToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="AI-generated"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 26,
        minWidth: 44,
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        boxSizing: 'border-box',
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 44,
          height: 26,
          borderRadius: 50,
          background: checked ? 'var(--gold)' : 'var(--surface-3)',
          border: `1px solid ${checked ? 'var(--gold-border)' : 'var(--border-hi)'}`,
          transition: 'background 150ms ease, border-color 150ms ease',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: checked ? 'var(--bg)' : 'var(--text-muted)',
            transition: 'left 150ms ease, background 150ms ease',
          }}
        />
      </span>
    </button>
  )
}

function extFromFile(file: File): string {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin'
}

const STAGE_LABEL: Record<Stage, string> = {
  idle: '',
  'uploading-audio': 'Uploading audio…',
  'uploading-artwork': 'Uploading artwork…',
  'saving-song': 'Saving song…',
  transcribing: 'Reading lyrics with Whisper AI — this can take a minute…',
  tagging: 'Tagging vibes with AI…',
  publishing: 'Publishing…',
  done: 'Live on Margo.',
  error: '',
}

export function SongUploadForm({ artistDisplayName, artistUsername = null, onComplete, onCancel, songId = null }: SongUploadFormProps) {
  const { user } = useIdentity()
  const isEdit = !!songId
  const [title, setTitle] = useState('')
  const [artistName, setArtistName] = useState(artistDisplayName)
  const [description, setDescription] = useState('')
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [atmosphere, setAtmosphere] = useState<AtmosphereId>('still')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null)
  const [existingArtworkUrl, setExistingArtworkUrl] = useState<string | null>(null)
  const [lyricsDraft, setLyricsDraft] = useState('')
  const [originalLines, setOriginalLines] = useState<LoadedLine[]>([])
  const [loadBusy, setLoadBusy] = useState(isEdit)
  const [dragOver, setDragOver] = useState(false)
  const artworkInputRef = useRef<HTMLInputElement>(null)

  const [showStreaming, setShowStreaming] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [appleMusicUrl, setAppleMusicUrl] = useState('')
  const [soundcloudUrl, setSoundcloudUrl] = useState('')
  const [audiomackUrl, setAudiomackUrl] = useState('')
  const [boomplayUrl, setBoomplayUrl] = useState('')

  const [whisperLang, setWhisperLang] = useState('auto')
  const [lyricsHint, setLyricsHint] = useState('')

  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [pendingSongId, setPendingSongId] = useState<string | null>(null)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)

  const busy = loadBusy || (stage !== 'idle' && stage !== 'error' && stage !== 'done')

  useEffect(() => {
    if (!songId) return
    let cancelled = false
    ;(async () => {
      setLoadBusy(true)
      setError('')
      const { data: song, error: songErr } = await supabase
        .from('songs')
        .select('id, title, artist_display_name, description, artwork_url, audio_url, is_ai_generated, atmosphere, youtube_url, spotify_url, apple_music_url, soundcloud_url, audiomack_url, boomplay_url')
        .eq('id', songId)
        .single()
      if (cancelled) return
      if (songErr || !song) {
        setError(songErr?.message || 'Could not load this song.')
        setStage('error')
        setLoadBusy(false)
        return
      }
      setTitle(song.title || '')
      setArtistName(song.artist_display_name || artistDisplayName)
      setDescription(song.description || '')
      setIsAiGenerated(song.is_ai_generated ?? false)
      setAtmosphere(parseAtmosphere(song.atmosphere))
      setExistingArtworkUrl(song.artwork_url)
      setExistingAudioUrl(song.audio_url)
      setArtworkPreview(song.artwork_url)
      setYoutubeUrl(song.youtube_url || '')
      setSpotifyUrl(song.spotify_url || '')
      setAppleMusicUrl(song.apple_music_url || '')
      setSoundcloudUrl(song.soundcloud_url || '')
      setAudiomackUrl(song.audiomack_url || '')
      setBoomplayUrl(song.boomplay_url || '')
      if (song.youtube_url || song.spotify_url || song.apple_music_url || song.soundcloud_url || song.audiomack_url || song.boomplay_url) {
        setShowStreaming(true)
      }

      const { data: lines, error: linesErr } = await supabase
        .from('lyric_lines')
        .select('line_index, text, start_sec, end_sec')
        .eq('song_id', songId)
        .order('line_index', { ascending: true })
      if (cancelled) return
      if (linesErr) {
        setError(linesErr.message)
        setStage('error')
        setLoadBusy(false)
        return
      }
      const loaded = (lines || []) as LoadedLine[]
      setOriginalLines(loaded)
      setLyricsDraft(loaded.map((l) => l.text).join('\n'))
      setLoadBusy(false)
    })()
    return () => { cancelled = true }
  }, [songId, artistDisplayName])

  const handleArtworkChange = (file: File | null) => {
    setArtworkFile(file)
    if (artworkPreview?.startsWith('blob:')) URL.revokeObjectURL(artworkPreview)
    setArtworkPreview(file ? URL.createObjectURL(file) : existingArtworkUrl)
  }

  const handleArtworkDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (busy) return
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleArtworkChange(file)
  }

  const runLyricsPipeline = async (songId: string, audioUrl: string) => {
    setStage('transcribing')
    const whisperRes = await fetch('/api/whisper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioUrl,
        songId,
        language: whisperLang === 'auto' ? undefined : whisperLang,
        prompt: lyricsHint.trim() || undefined,
      }),
    })
    const whisperData = await whisperRes.json()
    if (!whisperRes.ok || !whisperData.srt) {
      throw new Error(whisperData.error || 'Could not transcribe audio. Try again.')
    }

    setStage('tagging')
    const tagRes = await fetch('/api/tag-vibes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        srt: whisperData.srt,
        songTitle: title,
        artist: normalizeArtistCreditForSave(artistName || artistDisplayName, {
          displayName: artistDisplayName,
          username: artistUsername,
        }),
        songId,
      }),
    })
    const tagData = await tagRes.json()
    if (!tagRes.ok) {
      throw new Error(tagData.error || 'Could not tag lyric vibes. Try again.')
    }

    setStage('publishing')
    const { error: publishErr } = await supabase
      .from('songs')
      .update({ status: 'live' })
      .eq('id', songId)
    if (publishErr) throw new Error('Song processed but could not go live. Try publishing again.')

    setStage('done')
    setTimeout(onComplete, 900)
  }

  const handleRetry = async () => {
    if (!pendingSongId || !pendingAudioUrl) return
    setError('')
    try {
      await runLyricsPipeline(pendingSongId, pendingAudioUrl)
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
      setStage('error')
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) { setError('Add a title.'); return }

    try {
      const uid = user?.id
      if (!uid) { setError('Not signed in.'); return }

      if (isEdit && songId) {
        const lyricTexts = lyricsDraft.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
        if (originalLines.length > 0 && lyricTexts.length === 0) {
          setError('Lyrics cannot be empty.')
          return
        }

        let audioUrl = existingAudioUrl
        let artworkUrl = existingArtworkUrl

        if (audioFile) {
          setStage('uploading-audio')
          const audioExt = extFromFile(audioFile)
          const audioPath = `${uid}/${songId}.${audioExt}`
          const { error: audioUploadErr } = await supabase.storage
            .from('song-audio')
            .upload(audioPath, audioFile, { contentType: audioFile.type || undefined, upsert: true })
          if (audioUploadErr) throw new Error('Could not upload audio: ' + audioUploadErr.message)
          const { data: audioPublic } = supabase.storage.from('song-audio').getPublicUrl(audioPath)
          audioUrl = audioPublic.publicUrl
        }

        if (artworkFile) {
          setStage('uploading-artwork')
          const artworkExt = extFromFile(artworkFile)
          const artworkPath = `${uid}/${songId}.${artworkExt}`
          const { error: artworkUploadErr } = await supabase.storage
            .from('song-artwork')
            .upload(artworkPath, artworkFile, { contentType: artworkFile.type || undefined, upsert: true })
          if (artworkUploadErr) throw new Error('Could not upload artwork: ' + artworkUploadErr.message)
          const { data: artworkPublic } = supabase.storage.from('song-artwork').getPublicUrl(artworkPath)
          artworkUrl = artworkPublic.publicUrl
        }

        setStage('saving-song')
        const { error: updateErr } = await supabase
          .from('songs')
          .update({
            title: title.trim(),
            artist_display_name: normalizeArtistCreditForSave(artistName || artistDisplayName, {
              displayName: artistDisplayName,
              username: artistUsername,
            }),
            artwork_url: artworkUrl,
            audio_url: audioUrl,
            description: description.trim() || null,
            youtube_url: youtubeUrl.trim() || null,
            spotify_url: spotifyUrl.trim() || null,
            apple_music_url: appleMusicUrl.trim() || null,
            soundcloud_url: soundcloudUrl.trim() || null,
            audiomack_url: audiomackUrl.trim() || null,
            boomplay_url: boomplayUrl.trim() || null,
            is_ai_generated: isAiGenerated,
            atmosphere: toAtmosphereColumn(atmosphere),
            updated_at: new Date().toISOString(),
          })
          .eq('id', songId)
          .eq('owner_profile_id', uid)
        if (updateErr) throw new Error('Could not save song: ' + updateErr.message)

        if (lyricTexts.length > 0) {
          let lastEnd = 0
          const rows = lyricTexts.map((text, line_index) => {
            const orig = originalLines.find((l) => l.line_index === line_index)
            if (orig) {
              lastEnd = Number(orig.end_sec)
              return {
                song_id: songId,
                line_index,
                text,
                start_sec: orig.start_sec,
                end_sec: orig.end_sec,
              }
            }
            const start_sec = lastEnd
            const end_sec = start_sec + 3
            lastEnd = end_sec
            return { song_id: songId, line_index, text, start_sec, end_sec }
          })

          const { error: upsertErr } = await supabase
            .from('lyric_lines')
            .upsert(rows, { onConflict: 'song_id,line_index' })
          if (upsertErr) throw new Error('Could not save lyrics: ' + upsertErr.message)

          const { error: trimErr } = await supabase
            .from('lyric_lines')
            .delete()
            .eq('song_id', songId)
            .gt('line_index', lyricTexts.length - 1)
          if (trimErr) throw new Error('Could not trim extra lyric lines: ' + trimErr.message)
        }

        setStage('done')
        setTimeout(onComplete, 900)
        return
      }

      if (!audioFile) { setError('Add an audio file.'); return }
      if (!artworkFile) { setError('Artwork is required.'); return }

      const newSongId = crypto.randomUUID()

      setStage('uploading-audio')
      const audioExt = extFromFile(audioFile)
      const audioPath = `${uid}/${newSongId}.${audioExt}`
      const { error: audioUploadErr } = await supabase.storage
        .from('song-audio')
        .upload(audioPath, audioFile, { contentType: audioFile.type || undefined })
      if (audioUploadErr) throw new Error('Could not upload audio: ' + audioUploadErr.message)
      const { data: audioPublic } = supabase.storage.from('song-audio').getPublicUrl(audioPath)
      const audioUrl = audioPublic.publicUrl

      setStage('uploading-artwork')
      const artworkExt = extFromFile(artworkFile)
      const artworkPath = `${uid}/${newSongId}.${artworkExt}`
      const { error: artworkUploadErr } = await supabase.storage
        .from('song-artwork')
        .upload(artworkPath, artworkFile, { contentType: artworkFile.type || undefined })
      if (artworkUploadErr) throw new Error('Could not upload artwork: ' + artworkUploadErr.message)
      const { data: artworkPublic } = supabase.storage.from('song-artwork').getPublicUrl(artworkPath)
      const artworkUrl = artworkPublic.publicUrl

      setStage('saving-song')
      const { error: insertErr } = await supabase.from('songs').insert({
        id: newSongId,
        owner_profile_id: uid,
        title: title.trim(),
        artist_display_name: normalizeArtistCreditForSave(artistName || artistDisplayName, {
          displayName: artistDisplayName,
          username: artistUsername,
        }),
        artwork_url: artworkUrl,
        audio_url: audioUrl,
        description: description.trim() || null,
        status: 'processing',
        youtube_url: youtubeUrl.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        apple_music_url: appleMusicUrl.trim() || null,
        soundcloud_url: soundcloudUrl.trim() || null,
        audiomack_url: audiomackUrl.trim() || null,
        boomplay_url: boomplayUrl.trim() || null,
        is_ai_generated: isAiGenerated,
        ...(atmosphere === 'still' ? {} : { atmosphere: toAtmosphereColumn(atmosphere) }),
      })
      if (insertErr) throw new Error('Could not save song: ' + insertErr.message)

      setPendingSongId(newSongId)
      setPendingAudioUrl(audioUrl)

      await runLyricsPipeline(newSongId, audioUrl)
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
      setStage('error')
    }
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '24px',
    }}>
      <h3 style={{ fontFamily: font, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '20px', fontWeight: 600 }}>
        {isEdit ? 'Edit Song' : 'Upload a Song'}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(180px, 260px) 1fr',
        gap: '24px',
        marginBottom: '20px',
      }}
      className="studio-poster-grid"
      >
        {/* Live poster preview — doubles as the artwork dropzone */}
        <div>
          <input
            ref={artworkInputRef}
            type="file" accept="image/*"
            onChange={e => handleArtworkChange(e.target.files?.[0] || null)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => !busy && artworkInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); if (!busy) setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleArtworkDrop}
            aria-label={artworkPreview ? 'Change artwork' : 'Add artwork'}
            style={{
              position: 'relative', width: '100%', aspectRatio: '1 / 1',
              borderRadius: '16px', overflow: 'hidden',
              border: artworkPreview ? '1px solid var(--border)' : `1.5px dashed ${dragOver ? 'var(--gold)' : 'var(--gold-border)'}`,
              background: artworkPreview ? 'var(--surface-2)' : 'var(--gold-faint)',
              cursor: busy ? 'default' : 'pointer', padding: 0,
              display: 'block', boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
            }}
          >
            {artworkPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artworkPreview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', textAlign: 'center',
              }}>
                <UploadIcon />
                <span style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>
                  Add Artwork
                </span>
                <span style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {isEdit ? 'Optional · drag &amp; drop or tap' : 'Required · drag &amp; drop or tap'}
                </span>
              </div>
            )}

            {artworkPreview && (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(7,6,10,0.92) 0%, rgba(7,6,10,0.2) 55%, rgba(7,6,10,0) 75%)',
                }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px', textAlign: 'left' }}>
                  <p style={{
                    fontFamily: font, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)',
                    lineHeight: 1.25, marginBottom: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                  }}>
                    {title.trim() || 'Untitled'}
                  </p>
                  <p style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {(artistName || artistDisplayName).trim() || '—'}
                  </p>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Core fields */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title" style={inputStyle} disabled={busy} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Artist Name</label>
            <input
              value={artistName}
              onChange={e => setArtistName(e.target.value)}
              placeholder={artistDisplayName || 'Artist or stage name'}
              style={inputStyle}
              disabled={busy}
            />
            <p style={{
              fontFamily: font,
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              margin: '8px 0 0',
              lineHeight: 1.4,
            }}>
              Shown on songs as your public name
              {artistDisplayName ? ` (${artistDisplayName})` : ''}.
              {artistUsername ? ` @${artistUsername} is your unique handle — not the credit.` : ' Your @username stays unique and is not the song credit.'}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Audio File</label>
            <label style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '44px', padding: '0 16px',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50px',
              fontFamily: font, fontSize: '0.7rem', fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}>
              {audioFile ? 'Change Audio' : isEdit ? 'Replace Audio' : 'Choose Audio File'}
              <input
                type="file" accept="audio/*"
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                disabled={busy}
              />
            </label>
            {audioFile && (
              <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                {audioFile.name}
              </p>
            )}
            {isEdit && !audioFile && existingAudioUrl && (
              <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Current audio stays unless you replace it.
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Description (optional)</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          rows={2} placeholder="Short description shown on the music page"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          disabled={busy}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Atmosphere (optional)</label>
        <p style={{
          fontFamily: font,
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          margin: '0 0 10px',
          lineHeight: 1.5,
        }}>
          How the room feels while this song plays — not the lyric vibe tag.
          Breath is warm and close. Pulse bumps. Weight sits low and darker.
          Leave Still for none.
        </p>
        <div
          role="radiogroup"
          aria-label="Atmosphere"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          {ATMOSPHERE_OPTIONS.map((opt) => {
            const selected = atmosphere === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy}
                onClick={() => setAtmosphere(opt.id)}
                style={{
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: '50px',
                  border: `1px solid ${selected ? 'var(--gold-border)' : 'var(--border)'}`,
                  background: selected ? 'var(--gold-faint)' : 'transparent',
                  color: selected ? 'var(--gold)' : 'var(--text-secondary)',
                  fontFamily: font,
                  fontSize: '0.7rem',
                  fontWeight: selected ? 600 : 400,
                  letterSpacing: '0.6px',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{
        marginBottom: '16px',
        padding: '14px 16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: font,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 4px',
          }}>
            AI-generated
          </p>
          <p style={{
            fontFamily: font,
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Mark this if the song audio was created with AI tools. This will be shown wherever the song appears.
          </p>
        </div>
        <AiGeneratedToggle
          checked={isAiGenerated}
          onChange={setIsAiGenerated}
          disabled={busy}
        />
      </div>

      {isEdit && (
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Lyrics</label>
          <textarea
            value={lyricsDraft}
            onChange={e => setLyricsDraft(e.target.value)}
            rows={10}
            placeholder="One lyric line per row. Timing stays with each line index."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: '160px' }}
            disabled={busy}
          />
          <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
            Editing a line keeps its id. New lines append; removed trailing lines are dropped.
          </p>
        </div>
      )}

      {!isEdit && (
      <div style={{
        marginBottom: '20px', padding: '16px',
        background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Language</label>
            <select
              value={whisperLang} onChange={e => setWhisperLang(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}
              disabled={busy}
            >
              <option value="auto">Auto-detect</option>
              <optgroup label="African">
                <option value="zu">Zulu</option><option value="af">Afrikaans</option>
                <option value="am">Amharic</option><option value="ha">Hausa</option>
                <option value="ig">Igbo</option><option value="rw">Kinyarwanda</option>
                <option value="sn">Shona</option><option value="so">Somali</option>
                <option value="sw">Swahili</option><option value="xh">Xhosa</option>
                <option value="yo">Yoruba</option>
              </optgroup>
              <optgroup label="Asian / Pacific">
                <option value="tl">Filipino / Tagalog</option><option value="zh">Chinese</option>
                <option value="ja">Japanese</option><option value="ko">Korean</option>
                <option value="hi">Hindi</option><option value="id">Indonesian</option>
                <option value="ms">Malay</option><option value="th">Thai</option>
                <option value="vi">Vietnamese</option>
              </optgroup>
              <optgroup label="European">
                <option value="en">English</option><option value="pt">Portuguese</option>
                <option value="es">Spanish</option><option value="fr">French</option>
                <option value="de">German</option><option value="it">Italian</option>
              </optgroup>
              <optgroup label="Middle East / Central Asia">
                <option value="ar">Arabic</option><option value="he">Hebrew</option>
                <option value="fa">Persian</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Key Lyrics Hint (optional)</label>
            <input
              value={lyricsHint} onChange={e => setLyricsHint(e.target.value)}
              placeholder="Paste hook or chorus — helps Whisper get words right"
              style={inputStyle} disabled={busy}
            />
          </div>
        </div>
        <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
          Whisper AI reads the audio and tags every line with a vibe automatically once you publish.
        </p>
      </div>
      )}

      <button
        onClick={() => setShowStreaming(s => !s)}
        style={{
          width: '100%', textAlign: 'left', marginBottom: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px',
          padding: '11px 16px', color: 'var(--text-2)',
          fontFamily: font, fontSize: '0.7rem',
          textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer',
          minHeight: '44px',
        }}
        disabled={busy}
      >
        <span>Streaming Links (optional)</span>
        <ChevronIcon open={showStreaming} />
      </button>

      {showStreaming && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>YouTube</label>
            <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} style={inputStyle} disabled={busy} />
          </div>
          <div>
            <label style={labelStyle}>Spotify</label>
            <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} style={inputStyle} disabled={busy} />
          </div>
          <div>
            <label style={labelStyle}>Apple Music</label>
            <input value={appleMusicUrl} onChange={e => setAppleMusicUrl(e.target.value)} style={inputStyle} disabled={busy} />
          </div>
          <div>
            <label style={labelStyle}>SoundCloud</label>
            <input value={soundcloudUrl} onChange={e => setSoundcloudUrl(e.target.value)} style={inputStyle} disabled={busy} />
          </div>
          <div>
            <label style={labelStyle}>Audiomack</label>
            <input value={audiomackUrl} onChange={e => setAudiomackUrl(e.target.value)} style={inputStyle} disabled={busy} />
          </div>
          <div>
            <label style={labelStyle}>Boomplay</label>
            <input value={boomplayUrl} onChange={e => setBoomplayUrl(e.target.value)} style={inputStyle} disabled={busy} />
          </div>
        </div>
      )}

      {loadBusy && (
        <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '16px' }}>
          Loading song…
        </p>
      )}

      {(stage !== 'idle' || error) && (
        <p style={{
          fontFamily: font, fontSize: '0.82rem',
          /* NOTE: no lib/tokens/emotions.ts available — inline rgba stand-in
             for success/error states until that module exists. */
          color: stage === 'error' || (error && stage === 'idle') ? 'rgba(255,96,96,0.9)' : stage === 'done' ? 'rgba(74,222,128,0.9)' : 'var(--text-2)',
          marginBottom: '16px',
        }}>
          {stage === 'error' || (error && stage === 'idle') ? error : isEdit && stage === 'done' ? 'Saved.' : STAGE_LABEL[stage]}
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        {stage === 'error' && pendingSongId ? (
          <button
            onClick={handleRetry}
            style={{
              minHeight: '48px', padding: '14px 24px', background: 'var(--gold)', color: 'var(--bg)',
              border: 'none', borderRadius: '50px', fontFamily: font,
              fontWeight: 700, fontSize: '0.7rem', letterSpacing: '1.5px',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={busy || stage === 'done'}
            style={{
              minHeight: '48px', padding: '14px 24px',
              background: 'var(--gold)', color: 'var(--bg)', border: 'none',
              borderRadius: '50px', fontFamily: font,
              fontWeight: 700, fontSize: '0.7rem', letterSpacing: '1.5px',
              textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (isEdit ? 'Saving…' : 'Publishing…') : isEdit ? 'Save Changes' : 'Publish Song'}
          </button>
        )}
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            minHeight: '44px', padding: '11px 16px', background: 'transparent',
            color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '50px',
            fontFamily: font, fontSize: '0.7rem',
            letterSpacing: '1px', textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .studio-poster-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}