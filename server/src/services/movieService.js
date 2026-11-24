import catalog from '../data/sampleCatalog.json' with { type: 'json' }

export function listMovies() {
  return catalog.movies.map(({ cast, trailerId, ...summary }) => summary)
}

export function listTrailers() {
  return catalog.trailers
}

export function findMovie(movieId, now = new Date()) {
  const movie = catalog.movies.find(({ id }) => id === movieId)
  if (!movie) return null

  // Set showtimes at a fixed UTC hour and display them in the cinema's time zone.
  const showtimes = Array.from({ length: 4 }, (_, day) => [8, 12, 15].map((hour) => {
    const startsAt = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day + 1, hour,
    )).toISOString()
    return { id: `${movieId}-${startsAt}`, startsAt }
  })).flat()

  return { ...movie, showtimes, timeZone: 'Asia/Colombo' }
}

export function movieExists(movieId) {
  return catalog.movies.some(({ id }) => id === movieId)
}
