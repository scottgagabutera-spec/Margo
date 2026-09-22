const BUFFER_GRAPHQL_URL = 'https://api.buffer.com'

export interface BufferGraphQLError {
  message: string
  extensions?: Record<string, unknown>
}

export interface BufferGraphQLResponse<T> {
  data?: T
  errors?: BufferGraphQLError[]
}

export async function bufferGraphql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(BUFFER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (res.status === 401) {
    throw new Error('Buffer authorization expired — reconnect in Settings.')
  }

  const json = await res.json() as BufferGraphQLResponse<T>
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) {
    throw new Error('Buffer API returned no data')
  }
  return json.data
}
