export class TmdbError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function imageUrl(path, size) {
  return typeof path === 'string' && /^\/[\w.-]+$/.test(path)
    ? 'https://image.tmdb.org/t/p/' + size + path
    : ''
}

export function createTmdbService({ token, fetchImpl = fetch }) {
  async function get(path, params = {}) {
    if (!token) throw new TmdbError('TMDB is not configured. Ask the application administrator to add a read token.', 503)

    const url = new URL('https://api.themoviedb.org/3' + path)
    url.search = new URLSearchParams({ language: 'en-US', ...params })
    try {
      const response = await fetchImpl(url, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (response.status === 404) throw new TmdbError('TMDB could not find that movie.', 404)
      if (!response.ok) throw new TmdbError('TMDB is temporarily unavailable. Try again.', 502)
      return await response.json()
    } catch (error) {
      if (error instanceof TmdbError) throw error
      throw new TmdbError('TMDB is temporarily unavailable. Try again.', 502)
    }
  }

  return {
    async fetchNowPlaying(page) {
      const data = await get('/movie/now_playing', { page: String(page) })
      if (!Array.isArray(data.results) || !Number.isInteger(data.page)) {
        throw new TmdbError('TMDB returned an incomplete movie list. Try again.', 502)
      }
      return {
        movies: data.results.map((movie) => ({
          id: String(movie.id),
          title: movie.title,
          posterUrl: imageUrl(movie.poster_path, 'w500'),
          releaseDate: movie.release_date ?? '',
          rating: movie.vote_average ?? 0,
        })),
        page: data.page,
        totalPages: Math.max(1, Math.min(data.total_pages || 1, 500)),
      }
    },

    async fetchMovie(tmdbId) {
      const movie = await get('/movie/' + tmdbId, { append_to_response: 'credits,videos' })
      if (String(movie.id) !== tmdbId || !movie.title) {
        throw new TmdbError('TMDB returned incomplete movie details. Try again.', 502)
      }

      const trailers = (movie.videos?.results ?? []).filter(({ site, type, key }) => (
        site === 'YouTube' && type === 'Trailer' && /^[\w-]{11}$/.test(key)
      ))
      const trailer = trailers.find(({ official }) => official) ?? trailers[0]
      return {
        tmdbId,
        title: movie.title,
        overview: movie.overview ?? '',
        posterUrl: imageUrl(movie.poster_path, 'w500'),
        backdropUrl: imageUrl(movie.backdrop_path, 'w1280'),
        genres: (movie.genres ?? []).map(({ name }) => name),
        releaseDate: movie.release_date ?? '',
        originalLanguage: movie.original_language ?? '',
        rating: movie.vote_average ?? 0,
        runtime: movie.runtime ?? 0,
        cast: (movie.credits?.cast ?? []).filter(({ name }) => name).slice(0, 12)
          .map(({ name, profile_path }) => ({ name, imageUrl: imageUrl(profile_path, 'w185') })),
        trailerId: trailer?.key ?? null,
      }
    },
  }
}
