import { json, Router } from 'express'
import createShowsController from '../controllers/showsController.js'

export default function createShowsRouter(dependencies) {
  const router = Router()
  const controller = createShowsController(dependencies)
  router.get('/', controller.list)
  router.post('/', json({ limit: '16kb' }), controller.create)
  return router
}
