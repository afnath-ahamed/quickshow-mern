import { Router } from 'express'
import createMoviesController from '../controllers/moviesController.js'

export default function createMoviesRouter(movies) {
  const router = Router()
  const controller = createMoviesController(movies)
  router.get('/', controller.list)
  router.get('/:movieId', controller.details)
  return router
}
