import { request } from '../../shared/api/httpClient'

export type Movie = {
  id: string
  title: string
  overview: string
  posterUrl: string
  backdropUrl: string
  genres: string[]
  releaseDate: string
  originalLanguage: string
  rating: number
  runtime: number
}

export type Trailer = { id: string; title: string; thumbnailUrl: string }
export type Showtime = { id: string; startsAt: string }
export type MovieDetails = Movie & {
  cast: { name: string; imageUrl?: string }[]
  trailerId: string | null
  showtimes: Showtime[]
  timeZone: string
}

export async function getMovies(signal: AbortSignal) {
  const response = await request('/api/movies', { signal })
  if (!response.ok) throw new Error('Could not load the movie catalog.')
  return response.json() as Promise<{ movies: Movie[]; trailers: Trailer[] }>
}

export async function getMovie(movieId: string, signal: AbortSignal) {
  const response = await request('/api/movies/' + encodeURIComponent(movieId), { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Could not load this movie.')
  const { movie } = await response.json() as { movie: MovieDetails }
  return movie
}

export function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? [hours + 'h', remainder ? remainder + 'm' : ''].filter(Boolean).join(' ') : minutes + 'm'
}
