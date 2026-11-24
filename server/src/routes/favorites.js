import { Router } from 'express'
import createFavoritesController from '../controllers/favoritesController.js'

export default function createFavoritesRouter(requireAuth, favorites) {
  const router = Router()
  const controller = createFavoritesController(favorites)

  router.use(requireAuth)
  router.get('/', controller.list)
  router.put('/:movieId', controller.save)
  router.delete('/:movieId', controller.remove)

  return router
}
