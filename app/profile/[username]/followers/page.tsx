'use client'

import { useParams } from 'next/navigation'
import { ProfileFollowListPage } from '@/components/profile-follow-list'

export default function FollowersPage() {
  const params = useParams<{ username: string }>()
  const username = typeof params.username === 'string' ? params.username : ''
  return <ProfileFollowListPage username={username} kind="followers" />
}
