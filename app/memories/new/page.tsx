'use client'

import { useRouter } from 'next/navigation'
import { MemoryCreateFlow } from '@/components/memory-create-flow'
import { useRegisterNavBack } from '@/components/nav-back'

export default function NewMemoryPage() {
  const router = useRouter()

  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed' })

  return <MemoryCreateFlow onClose={() => router.back()} />
}
