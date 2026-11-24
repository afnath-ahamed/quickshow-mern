export default function createFavoritesController(favorites, movies) {
  return {
    async list(_request, response) {
      const movieIds = await favorites.listFavorites(response.locals.currentUser.userId)
      return response.json({ movieIds, movies: await movies.listSavedMovies(movieIds) })
    },
    async save(request, response) {
      const { movieId } = request.params
      if (!(await movies.movieExists(movieId))) return response.status(404).json({ message: 'Movie not found.' })
      await favorites.saveFavorite(response.locals.currentUser.userId, movieId)
      return response.sendStatus(204)
    },
    async remove(request, response) {
      await favorites.removeFavorite(response.locals.currentUser.userId, request.params.movieId)
      return response.sendStatus(204)
    },
  }
}
