import { raw, Router } from 'express'
import createStripeWebhookController from '../controllers/stripeWebhookController.js'

export default function createStripeWebhookRouter(payments) {
  const router = Router()
  router.post('/', raw({ type: 'application/json' }), createStripeWebhookController(payments))
  return router
}
