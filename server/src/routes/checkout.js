import { Router } from 'express'
import createCheckoutController from '../controllers/checkoutController.js'

export default function createCheckoutRouter(requireAuth, payments) {
  const router = Router()
  const controller = createCheckoutController(payments)
  router.use(requireAuth)
  router.get('/:bookingId', controller.status)
  router.post('/:bookingId', controller.start)
  return router
}
