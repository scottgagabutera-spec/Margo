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

// Read synchronously so username is never empty on first render
function getOrCreateUsername(): string {
  if (typeof window === 'undefined') return ''
  let name = localStorage.getItem('margoAnonName')
  if (!name) {
    name = generateUsername()
    localStorage.setItem('margoAnonName', name)
  }
  return name
}

export function useUsername() {
  const [username, setUsernameState] = useState<string>(getOrCreateUsername)
  const [hasConfirmed, setHasConfirmedState] = useState<boolean>(false)
  const [hasEdited, setHasEditedState] = useState<boolean>(false)

  useEffect(() => {
    setHasConfirmedState(localStorage.getItem('margoNameConfirmed') === 'true')
    setHasEditedState(localStorage.getItem('margoNameEdited') === 'true')
  }, [])

  // Confirm the name (first time — no edit)
  const confirmUsername = () => {
    localStorage.setItem('margoNameConfirmed', 'true')
    setHasConfirmedState(true)
  }

  // Edit once — only allowed if not yet edited
  const editUsername = (newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || hasEdited) return
    localStorage.setItem('margoAnonName', trimmed)
    localStorage.setItem('margoNameConfirmed', 'true')
    localStorage.setItem('margoNameEdited', 'true')
    setUsernameState(trimmed)
    setHasConfirmedState(true)
    setHasEditedState(true)
  }

  return { username, hasConfirmed, hasEdited, confirmUsername, editUsername }
}
