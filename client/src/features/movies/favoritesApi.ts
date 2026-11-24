import { request } from '../../shared/api/httpClient'
import type { Movie } from './moviesApi'

type GetToken = () => Promise<string | null>

async function authorization(getToken: GetToken) {
  const token = await getToken()
  if (!token) throw new Error('Your session ended. Sign in to continue.')
  return { Authorization: 'Bearer ' + token }
}

async function readFavorites(getToken: GetToken, signal: AbortSignal) {
  const response = await request('/api/favorites', { headers: await authorization(getToken), signal })
  if (!response.ok) throw new Error('Could not load your favorites.')
  return response.json() as Promise<{ movieIds: string[]; movies: Movie[] }>
}

export async function getFavorites(getToken: GetToken, signal: AbortSignal) {
  return (await readFavorites(getToken, signal)).movieIds
}

export async function getFavoriteMovies(getToken: GetToken, signal: AbortSignal) {
  return (await readFavorites(getToken, signal)).movies
}

export async function updateFavorite(getToken: GetToken, movieId: string, saved: boolean) {
  const response = await request('/api/favorites/' + encodeURIComponent(movieId), {
    method: saved ? 'PUT' : 'DELETE',
    headers: await authorization(getToken),
  })
  if (!response.ok) throw new Error('Could not update your favorites. Try again.')
}
