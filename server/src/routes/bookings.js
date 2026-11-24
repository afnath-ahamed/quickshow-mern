import { json, Router } from 'express'
import { listMyBookings, reserveSeats } from '../controllers/bookingsController.js'

export default function createBookingsRouter(requireAuth) {
  const router = Router()
  router.use(requireAuth)
  router.get('/me', listMyBookings)
  router.post('/', json({ limit: '8kb' }), reserveSeats)
  return router
}
