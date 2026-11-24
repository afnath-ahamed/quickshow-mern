import { findMovie, listMovies, listTrailers } from '../services/movieService.js'

export function getMovies(_request, response) {
  response.json({ movies: listMovies(), trailers: listTrailers() })
}

export function getMovie(request, response) {
  const movie = findMovie(request.params.movieId)
  if (!movie) return response.status(404).json({ message: 'Movie not found.' })
  return response.json({ movie })
}
