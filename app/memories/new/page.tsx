'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MemoryCreateFlow } from '@/components/memory-create-flow'
import { ListeningMemorySheet } from '@/components/listening-memory-sheet'
import { useRegisterNavBack } from '@/components/nav-back'
import { feedReturnFallbackHref } from '@/lib/feed-exit-nav'
import { popFeedStackIfPinned } from '@/lib/feed-stack-back'
import { navigatePostThreadBack } from '@/lib/post-thread-nav'

export default function NewMemoryPage() {
  const router = useRouter()
  const params = useSearchParams()
  const entry = params.get('entry')
  const focusStory = params.get('focus') === 'story'
  const openListening = params.get('listening') === '1'
  const [listeningOpen, setListeningOpen] = useState(openListening)

  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed' })

  const launchEntry = entry === 'media' ? 'media' : entry === 'words' ? 'words' : undefined

  return (
    <>
      <MemoryCreateFlow
        onClose={() => {
          if (!popFeedStackIfPinned()) {
            navigatePostThreadBack(router, feedReturnFallbackHref())
          }
        }}
        launchEntry={launchEntry}
        focusStory={focusStory}
        onOpenListening={() => setListeningOpen(true)}
      />
      <ListeningMemorySheet
        open={listeningOpen}
        onOpenChange={(open) => {
          setListeningOpen(open)
          if (!open && openListening) router.back()
        }}
      />
    </>
  )
}
