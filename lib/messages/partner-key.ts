/** Matches profile / message partner keys passed as UUIDs in URLs. */
const PARTNER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPartnerUuid(value: string): boolean {
  return PARTNER_UUID_RE.test(value)
}
