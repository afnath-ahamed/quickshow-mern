import { Router } from 'express'
import { getCurrentUser } from '../controllers/usersController.js'

export default function createUsersRouter(requireAuth) {
  const router = Router()
  router.get('/me', requireAuth, getCurrentUser)
  return router
}
