import { json, Router } from 'express'
import { serve } from 'inngest/express'
import { createNotificationFunctions, inngest } from '../jobs/inngest.js'

export default function createInngestRouter(dependencies) {
  const router = Router()
  router.all('/', json({ limit: '512kb' }), serve({
    client: inngest, functions: createNotificationFunctions(inngest, dependencies),
  }))
  return router
}
