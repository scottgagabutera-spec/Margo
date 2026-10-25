// components/avatar-upload.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { MargoPhotoSource } from '@/components/margo-photo-source'
import { PortraitAvatarCropSheet } from '@/components/portrait-avatar-crop-sheet'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { useIdentity } from '@/hooks/useIdentity'
import { uploadProfileAvatar } from '@/lib/profile-avatar-upload'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT
const bg = 'var(--bg)'
const text2 = 'var(--text-secondary)'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  displayName: string
  onUploaded?: (url: string) => void
  /** Persist form draft before OS photo picker (mobile may skip visibility events). */
  onBeforePick?: () => void
}

export function AvatarUpload({ currentAvatarUrl, displayName, onUploaded, onBeforePick }: AvatarUploadProps) {
  const { user } = useIdentity()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Local override after a successful upload this session; otherwise follow the prop.
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const previewUrl = localPreview ?? currentAvatarUrl
  const showPhoto = !!previewUrl && !imgFailed

  useEffect(() => {
    setImgFailed(false)
  }, [previewUrl])

  const uploadFile = async (file: File) => {
    if (!user) return

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
      const freshUrl = await uploadProfileAvatar(user.id, file)

      setLocalPreview(freshUrl)
      setImgFailed(false)
      onUploaded?.(freshUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setError('Could not upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <MargoPortraitAvatar
        size="profile"
        imageUrl={showPhoto ? previewUrl : null}
        onImageError={() => setImgFailed(true)}
        fallbackInitial={(displayName || '??').charAt(0).toUpperCase()}
        brandMark={false}
        separationRingColor="var(--bg)"
      />

      {error && (
        <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          onBeforePick?.()
          setSourceOpen(true)
        }}
        disabled={uploading}
        style={{
          minHeight: 'var(--margo-touch-min)', padding: '0 20px',
          display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
          background: 'var(--surface-2)', color: text2,
          border: '1px solid var(--border)',
          borderRadius: '50px', fontFamily: font, fontWeight: 600,
          fontSize: TYPE.label, letterSpacing: '0.16em', textTransform: 'uppercase',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Uploading…' : showPhoto ? 'Change Photo' : 'Add Photo'}
      </button>

      <MargoPhotoSource
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        title="Profile photo"
        onFile={(file) => {
          setPendingFile(file)
          setCropOpen(true)
        }}
      />
      <PortraitAvatarCropSheet
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={pendingFile}
        onConfirm={(cropped) => {
          setPendingFile(null)
          void uploadFile(cropped)
        }}
      />
    </div>
  )
}
