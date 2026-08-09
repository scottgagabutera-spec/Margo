'use client'

import { useState } from 'react'
import { saveCurrentQueueAsPlaylist } from '@/lib/queues'
import { useAuthGate } from '@/components/supabase-auth-provider'

export function SaveQueueButton({ defaultTitle }: { defaultTitle: string }) {
  const { requireAuth, user } = useAuthGate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!requireAuth() || !user) return
    setSaving(true)
    const result = await saveCurrentQueueAsPlaylist(defaultTitle, false, user.id)
    setSaving(false)
    if (result) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      style={{
        padding: '10px 20px',
        background: saved ? 'rgba(232,197,71,0.18)' : 'rgba(255,255,255,0.05)',
        border: '1px solid ' + (saved ? 'rgba(232,197,71,0.3)' : 'rgba(255,255,255,0.12)'),
        borderRadius: '50px',
        fontFamily: 'var(--font-lora), serif',
        fontSize: '0.58rem', fontWeight: 700,
        letterSpacing: '1px', textTransform: 'uppercase',
        color: saved ? 'var(--gold)' : 'rgba(255,255,255,0.75)',
        cursor: saving ? 'default' : 'pointer',
        opacity: saving ? 0.6 : 1,
        transition: 'all 200ms ease',
      }}
    >
      {saved ? 'Saved' : saving ? 'Saving…' : 'Save Queue'}
    </button>
  )
}