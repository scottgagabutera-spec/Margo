'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'

export function useLicensedArtists() {
  const [artists, setArtists] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const unsub = onValue(ref(db, 'adminConfig/licensedArtists'), (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        if (Array.isArray(data)) {
          setArtists(data.map((a: string) => a.toLowerCase().trim()))
        } else if (typeof data === 'object') {
          setArtists(Object.values(data).map((a: any) => String(a).toLowerCase().trim()))
        }
      } else {
        setArtists(['margo'])
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
