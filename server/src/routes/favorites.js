import { Router } from 'express'
import createFavoritesController from '../controllers/favoritesController.js'

export default function createFavoritesRouter(requireAuth, favorites, movies) {
  const router = Router()
  const controller = createFavoritesController(favorites, movies)

  router.use(requireAuth)
  router.get('/', controller.list)
  router.put('/:movieId', controller.save)
  router.delete('/:movieId', controller.remove)

  return router
}
