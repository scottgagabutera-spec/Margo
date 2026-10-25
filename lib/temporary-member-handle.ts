import { USERNAME_MAX_LENGTH } from '@/lib/username-validator'

/** Internal-only handle until the person sets a real username (never suggested in UI). */
export function createTemporaryMemberHandle(): string {
  const digits = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9)
  const handle = `member${digits}`
  return handle.slice(0, USERNAME_MAX_LENGTH)
}
