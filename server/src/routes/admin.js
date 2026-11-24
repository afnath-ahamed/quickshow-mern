import { Router } from 'express'
import { getAdminAccess } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export default function createAdminRouter(requireAuth) {
  const router = Router()
  router.get('/access', requireAuth, requireAdmin, getAdminAccess)
  return router
}
