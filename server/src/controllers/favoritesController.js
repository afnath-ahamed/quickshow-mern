import { movieExists } from '../services/movieService.js'

export default function createFavoritesController(favorites) {
  return {
    async list(_request, response) {
      const movieIds = await favorites.listFavorites(response.locals.currentUser.userId)
      return response.json({ movieIds })
    },
    async save(request, response) {
      const { movieId } = request.params
      if (!movieExists(movieId)) return response.status(404).json({ message: 'Movie not found.' })
      await favorites.saveFavorite(response.locals.currentUser.userId, movieId)
      return response.sendStatus(204)
    },
    async remove(request, response) {
      await favorites.removeFavorite(response.locals.currentUser.userId, request.params.movieId)
      return response.sendStatus(204)
    },
  }
}
