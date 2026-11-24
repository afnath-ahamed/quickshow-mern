import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express'
import cors from 'cors'
import express from 'express'
import { readEnvironment } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createRequireAuth } from './middleware/requireAuth.js'
import createAdminRouter from './routes/admin.js'
import healthRouter from './routes/health.js'
import createUsersRouter from './routes/users.js'

export function createApp({
  frontendOrigin = readEnvironment().frontendOrigin,
  authenticate = clerkMiddleware({ authorizedParties: [frontendOrigin] }),
  readAuth = getAuth,
  getUser = (userId) => clerkClient.users.getUser(userId),
} = {}) {
  const app = express()
  const requireAuth = createRequireAuth({ readAuth, getUser })

  app.use(cors({ origin: frontendOrigin }))
  app.use('/api', healthRouter)
  app.use('/api/users', authenticate, createUsersRouter(requireAuth))
  app.use('/api/admin', authenticate, createAdminRouter(requireAuth))
  app.use(errorHandler)

  return app
}

export default createApp()
