'use client'
import { useState, useEffect } from 'react'

const INSTRUMENTS = [
  'Guitar','Piano','Violin','Cello','Drums','Bass','Flute','Harp',
  'Trumpet','Sitar','Viola','Banjo','Saxophone','Clarinet','Ukulele',
  'Organ','Synth','Mandolin','Trombone'
]

function generateUsername() {
  const instrument = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)]
  const number = Math.floor(Math.random() * 9000) + 1000
  return `${instrument}#${number}`
}

export function useUsername() {
  const [username, setUsername] = useState<string>('')

  useEffect(() => {
    let name = localStorage.getItem('margoAnonName')
    if (!name) {
      name = generateUsername()
      localStorage.setItem('margoAnonName', name)
    }
    setUsername(name)
  }, [])

  return { username }
}
