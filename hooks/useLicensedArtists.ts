'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'

export function useLicensedArtists() {
  const [artists, setArtists] = useState<string[]>(['margo', 'trymargo'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const unsub = onValue(ref(db, 'adminConfig/licensedArtists'), (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        if (Array.isArray(data)) {
          setArtists(data.map((a: string) => a.toLowerCase().trim()).filter(Boolean))
        } else if (typeof data === 'string') {
          setArtists([data.toLowerCase().trim()])
        } else if (typeof data === 'object' && data !== null) {
          setArtists(Object.values(data).map((a: any) => String(a).toLowerCase().trim()).filter(Boolean))
        }
      } else {
        setArtists(['trymargo'])
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const isLicensed = (artistName: string) => {
    return artists.includes(artistName.toLowerCase().trim())
  }

  return { artists, isLicensed, loading }
}
