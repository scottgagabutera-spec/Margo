'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { ImagePlusIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()
const font = UI_FONT

export async function uploadProfileCover(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5MB.')
  }
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/cover.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ cover_url: freshUrl })
    .eq('id', userId)
  if (updateError) throw updateError
  return freshUrl
}

export function CoverUpload({
  currentCoverUrl,
  onUploaded,
}: {
  currentCoverUrl: string | null
  onUploaded?: (url: string) => void
}) {
  const { user } = useIdentity()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrl = localPreview ?? currentCoverUrl

  useEffect(() => {
    setLocalPreview(null)
  }, [currentCoverUrl])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadProfileCover(user.id, file)
      setLocalPreview(url)
      onUploaded?.(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload cover. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label={previewUrl ? 'Change cover photo' : 'Add cover photo'}
        style={{
          display: 'block',
          width: '100%',
          height: '120px',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: previewUrl ? 'var(--surface-2)' : 'var(--surface)',
          position: 'relative',
          cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ImagePlusIcon size={28} color="var(--gold)" />
          </span>
        )}
        <span style={{
          position: 'absolute',
          right: '10px',
          bottom: '10px',
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          borderRadius: '50%',
          background: 'var(--margo-bar)',
          border: '1px solid var(--border-hi)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ImagePlusIcon size={18} color="var(--gold)" />
        </span>
      </button>
      {error && (
        <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          {error}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}
