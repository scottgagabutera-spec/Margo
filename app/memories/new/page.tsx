'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MemoryCreateFlow } from '@/components/memory-create-flow'
import { useRegisterNavBack } from '@/components/nav-back'

export default function NewMemoryPage() {
  const router = useRouter()
  const params = useSearchParams()
  const entry = params.get('entry')
  const focusStory = params.get('focus') === 'story'

  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed' })

  const launchEntry = entry === 'media' ? 'media' : entry === 'words' ? 'words' : undefined

  return (
    <MemoryCreateFlow
      onClose={() => router.back()}
      launchEntry={launchEntry}
      focusStory={focusStory}
    />
  )
}
