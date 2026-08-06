// components/avatar-upload.tsx
'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'

const font = 'var(--font-lora), serif'
const gold = 'var(--gold)'
const bg = 'var(--bg)'
const text2 = 'var(--text-2)'
const textMuted = 'var(--text-muted)'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  displayName: string
  onUploaded?: (url: string) => void
}

export function AvatarUpload({ currentAvatarUrl, displayName, onUploaded }: AvatarUploadProps) {
  const { user } = useIdentity()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = (displayName || '??').slice(0, 2).toUpperCase()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the new image shows immediately instead of a stale cached version
      const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: freshUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPreviewUrl(freshUrl)
      onUploaded?.(freshUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setError('Could not upload image. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          width: '88px', height: '88px', borderRadius: '50%', flexShrink: 0,
          background: previewUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPreviewUrl(null)}
          />
        ) : (
          <span style={{ fontFamily: font, fontSize: '1.6rem', fontWeight: 700, color: bg }}>
            {initials}
          </span>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: font, fontSize: '0.82rem', color: '#ff6b6b', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          minHeight: 'var(--margo-touch-min)', padding: '0 20px',
          display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
          background: 'var(--surface-2)', color: text2,
          border: '1px solid var(--border)',
          borderRadius: '50px', fontFamily: font, fontWeight: 600,
          fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Uploading…' : previewUrl ? 'Change Photo' : 'Add Photo'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <p style={{ fontFamily: font, fontSize: '0.6rem', color: textMuted, textAlign: 'center' }}>
        JPG, PNG, or WebP. Max 5MB.
      </p>
    </div>
  )
}