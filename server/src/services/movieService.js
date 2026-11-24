import catalog from '../data/sampleCatalog.json' with { type: 'json' }
import Movie from '../models/Movie.js'
import Show from '../models/Show.js'
import { cinemaTimeZone, serializeShow } from './showService.js'

const sampleMovies = new Map(catalog.movies.map((movie) => [movie.id, movie]))

function summary(movie) {
  const { title, overview, posterUrl, backdropUrl, genres, releaseDate, originalLanguage, rating, runtime } = movie
  return { id: movie.tmdbId ?? movie.id, title, overview, posterUrl, backdropUrl, genres, releaseDate, originalLanguage, rating, runtime }
}

export async function listMovies() {
  const movieIds = await Show.distinct('movie', { startsAt: { $gt: new Date() }, movie: { $type: 'objectId' } })
  const movies = await Movie.find({ _id: { $in: movieIds }, tmdbId: { $type: 'string' } }).sort({ title: 1, tmdbId: 1 }).lean()
  return movies.map(summary)
}

export function listTrailers() {
  return catalog.trailers
}

export async function findMovie(movieId) {
  if (!/^[1-9][0-9]{0,9}$/.test(movieId)) return null
  const storedMovie = await Movie.findOne({ tmdbId: movieId }).lean()
  const movie = storedMovie ?? sampleMovies.get(movieId)
  if (!movie) return null

  const shows = storedMovie
    ? await Show.find({ movie: storedMovie._id, startsAt: { $gt: new Date() } }).sort({ startsAt: 1 }).lean()
    : []
  return {
    ...summary(movie),
    cast: movie.cast,
    trailerId: movie.trailerId,
    showtimes: shows.map((show) => serializeShow(show)),
    timeZone: cinemaTimeZone,
  }
}

export async function listSavedMovies(movieIds) {
  const records = await Movie.find({ tmdbId: { $in: movieIds } }).lean()
  const storedMovies = new Map(records.map((movie) => [movie.tmdbId, movie]))
  return movieIds.flatMap((id) => {
    const movie = storedMovies.get(id) ?? sampleMovies.get(id)
    return movie ? [summary(movie)] : []
  })
}

export async function movieExists(movieId) {
  return sampleMovies.has(movieId) || Boolean(await Movie.exists({ tmdbId: movieId }))
}
