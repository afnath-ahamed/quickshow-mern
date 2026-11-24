import { request } from '../../shared/api/httpClient'

type GetToken = () => Promise<string | null>

export type Screening = {
  id: string
  movieId: string
  title: string
  startsAt: string
  priceMinor: number
  currency: string
  bookingCounts?: { holds: number; confirmed: number }
}

type ScheduleSettings = {
  currency: string
  timeZone: string
  maxScreenings: number
}

export type DashboardData = ScheduleSettings & {
  activeShows: number
  users: number | null
  bookingCounts: { holds: number; confirmed: number }
  upcoming: Screening[]
}

export type TmdbMovie = {
  id: string
  title: string
  posterUrl: string
  releaseDate: string
  rating: number
}

export type NowPlayingPage = ScheduleSettings & {
  movies: TmdbMovie[]
  page: number
  totalPages: number
}

type ShowsPage = {
  shows: Screening[]
  total: number
  page: number
  pageSize: number
  timeZone: string
}

type ScheduleInput = { movieId: string; priceMinor: number; startsAt: string[] }

async function adminRequest<T>(getToken: GetToken, path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
  if (!token) throw new Error('Sign in to continue.')

  const headers = new Headers(options.headers)
  headers.set('Authorization', 'Bearer ' + token)
  let response: Response
  try {
    response = await request('/api/admin' + path, { ...options, headers })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error('Could not reach the QuickShow API. Try again.')
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(error?.message || 'The request failed. Try again.')
  }
  return response.json() as Promise<T>
}

export function getDashboard(getToken: GetToken, signal: AbortSignal) {
  return adminRequest<DashboardData>(getToken, '/dashboard', { signal })
}

export function getNowPlaying(getToken: GetToken, page: number, signal: AbortSignal) {
  return adminRequest<NowPlayingPage>(getToken, '/movies/now-playing?page=' + page, { signal })
}

export function getShows(getToken: GetToken, page: number, signal: AbortSignal) {
  return adminRequest<ShowsPage>(getToken, '/shows?page=' + page, { signal })
}

export function createShows(getToken: GetToken, input: ScheduleInput) {
  return adminRequest<{ shows: Screening[] }>(getToken, '/shows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
