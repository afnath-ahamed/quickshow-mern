export default function createMoviesController(movies) {
  return {
    async list(_request, response) {
      return response.json({ movies: await movies.listMovies(), trailers: movies.listTrailers() })
    },
    async details(request, response) {
      const movie = await movies.findMovie(request.params.movieId)
      if (!movie) return response.status(404).json({ message: 'Movie not found.' })
      return response.json({ movie })
    },
  }
}
