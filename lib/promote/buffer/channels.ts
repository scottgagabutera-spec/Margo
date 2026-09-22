import { bufferGraphql } from '@/lib/promote/buffer/client'
import type { BufferChannelSnapshot } from '@/lib/promote/buffer/service-map'

interface AccountOrganizationsResult {
  account: {
    organizations: Array<{ id: string; name: string }>
  }
}

interface ChannelsResult {
  channels: Array<{
    id: string
    name: string
    service: string
    displayName?: string | null
  }>
}

export async function fetchBufferOrganizations(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const data = await bufferGraphql<AccountOrganizationsResult>(
    accessToken,
    `query GetOrganizations {
      account {
        organizations { id name }
      }
    }`,
  )
  return data.account?.organizations ?? []
}

export async function fetchBufferChannels(
  accessToken: string,
  organizationId: string,
): Promise<BufferChannelSnapshot[]> {
  const data = await bufferGraphql<ChannelsResult>(
    accessToken,
    `query GetChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id
        name
        service
        displayName
      }
    }`,
    { organizationId },
  )
  return (data.channels ?? []).map((ch) => ({
    id: ch.id,
    name: ch.name,
    service: ch.service,
    displayName: ch.displayName ?? null,
  }))
}

/** Pick the first org when the account has one; Buffer keys are account-wide. */
export async function fetchAllBufferChannels(accessToken: string): Promise<{
  organizationId: string | null
  channels: BufferChannelSnapshot[]
}> {
  const orgs = await fetchBufferOrganizations(accessToken)
  if (orgs.length === 0) {
    return { organizationId: null, channels: [] }
  }
  const organizationId = orgs[0].id
  const channels = await fetchBufferChannels(accessToken, organizationId)
  return { organizationId, channels }
}
