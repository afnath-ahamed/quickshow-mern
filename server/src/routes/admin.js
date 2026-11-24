import { Router } from 'express'
import { createAdminController, getAdminAccess } from '../controllers/adminController.js'
import { listAdminBookings } from '../controllers/bookingsController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import createShowsRouter from './shows.js'

export default function createAdminRouter(requireAuth, dependencies) {
  const router = Router()
  const controller = createAdminController(dependencies)
  router.use(requireAuth, requireAdmin)
  router.get('/access', getAdminAccess)
  router.get('/dashboard', controller.getDashboard)
  router.get('/movies/now-playing', controller.getNowPlaying)
  router.get('/bookings', listAdminBookings)
  router.use('/shows', createShowsRouter(dependencies))
  return router
}
