import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32

function encryptionKey(): Buffer {
  const raw = process.env.PROMOTE_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('PROMOTE_TOKEN_ENCRYPTION_KEY is not configured')
  }
  if (raw.length >= 44 && /^[A-Za-z0-9+/=]+$/.test(raw)) {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === KEY_BYTES) return decoded
  }
  return scryptSync(raw, 'margo-promote-token-vault', KEY_BYTES)
}

/** Encrypt OAuth tokens for storage. Format: base64(iv + tag + ciphertext). */
export function encryptPromoteToken(plaintext: string): string {
  const key = encryptionKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptPromoteToken(payload: string): string {
  const key = encryptionKey()
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('Invalid encrypted token payload')
  }
  const iv = buf.subarray(0, IV_BYTES)
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const encrypted = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
