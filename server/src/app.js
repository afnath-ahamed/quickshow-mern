import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express'
import cors from 'cors'
import express from 'express'
import { readEnvironment } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createRequireAuth } from './middleware/requireAuth.js'
import createAdminRouter from './routes/admin.js'
import createFavoritesRouter from './routes/favorites.js'
import healthRouter from './routes/health.js'
import moviesRouter from './routes/movies.js'
import createUsersRouter from './routes/users.js'
import * as favoriteService from './services/favoriteService.js'

export function createApp({
  frontendOrigin = readEnvironment().frontendOrigin,
  authenticate = clerkMiddleware({ authorizedParties: [frontendOrigin] }),
  readAuth = getAuth,
  getUser = (userId) => clerkClient.users.getUser(userId),
  favorites = favoriteService,
} = {}) {
  const app = express()
  const requireAuth = createRequireAuth({ readAuth, getUser })

  app.use(cors({ origin: frontendOrigin }))
  app.use('/api', healthRouter)
  app.use('/api/movies', moviesRouter)
  app.use('/api/favorites', authenticate, createFavoritesRouter(requireAuth, favorites))
  app.use('/api/users', authenticate, createUsersRouter(requireAuth))
  app.use('/api/admin', authenticate, createAdminRouter(requireAuth))
  app.use(errorHandler)

  return app
}

export default createApp()
