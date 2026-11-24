import { request } from '../../shared/api/httpClient'

type GetToken = () => Promise<string | null>

async function authorization(getToken: GetToken) {
  const token = await getToken()
  if (!token) throw new Error('Your session ended. Sign in to continue.')
  return { Authorization: 'Bearer ' + token }
}

export async function getFavorites(getToken: GetToken, signal: AbortSignal) {
  const response = await request('/api/favorites', { headers: await authorization(getToken), signal })
  if (!response.ok) throw new Error('Could not load your favorites.')
  const { movieIds } = await response.json() as { movieIds: string[] }
  return movieIds
}

export async function updateFavorite(getToken: GetToken, movieId: string, saved: boolean) {
  const response = await request('/api/favorites/' + encodeURIComponent(movieId), {
    method: saved ? 'PUT' : 'DELETE',
    headers: await authorization(getToken),
  })
  if (!response.ok) throw new Error('Could not update your favorites. Try again.')
}
