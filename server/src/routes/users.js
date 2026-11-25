import { verifyWebhook } from '@clerk/express/webhooks'
import { json, raw, Router } from 'express'
import { getCurrentUser, getEmailPreferences, updateEmailPreferences } from '../controllers/usersController.js'
import { queueJob } from '../models/NotificationJob.js'

export default function createUsersRouter(requireAuth) {
  const router = Router()
  router.get('/me', requireAuth, getCurrentUser)
  router.get('/me/email-preferences', requireAuth, getEmailPreferences)
  router.put('/me/email-preferences', requireAuth, json({ limit: '2kb' }), updateEmailPreferences)
  return router
}

const userEvents = new Set(['user.created', 'user.updated', 'user.deleted'])

export function createClerkWebhookRouter(signingSecret) {
  const router = Router()
  router.post('/', raw({ type: 'application/json', limit: '256kb' }), async (request, response) => {
    let event
    try {
      event = await verifyWebhook(request, { signingSecret })
    } catch {
      return response.status(400).json({ message: 'Invalid Clerk webhook signature.' })
    }
    const userId = event.data?.id
    if (userEvents.has(event.type) && typeof userId === 'string' && /^user_[a-zA-Z0-9]+$/.test(userId)) {
      const id = request.get('svix-id') || request.get('webhook-id')
      await queueJob({ id: 'clerk:' + id, kind: 'clerk', reference: userId })
    }
    return response.sendStatus(200)
  })
  return router
}
