import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express'
import cors from 'cors'
import express from 'express'
import { readEnvironment } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createRequireAuth } from './middleware/requireAuth.js'
import createAdminRouter from './routes/admin.js'
import createBookingsRouter from './routes/bookings.js'
import createCheckoutRouter from './routes/checkout.js'
import createStripeWebhookRouter from './routes/stripeWebhook.js'
import { seatAvailability } from './controllers/bookingsController.js'
import createFavoritesRouter from './routes/favorites.js'
import healthRouter from './routes/health.js'
import createInngestRouter from './routes/inngest.js'
import createMoviesRouter from './routes/movies.js'
import createUsersRouter, { createClerkWebhookRouter } from './routes/users.js'
import { getDashboard, listShowsWithBookingCounts } from './services/adminService.js'
import * as favoriteService from './services/favoriteService.js'
import { createEmailSender } from './services/emailService.js'
import * as movieService from './services/movieService.js'
import { scheduleShows } from './services/showService.js'
import { createPaymentService } from './services/paymentService.js'
import { createTmdbService } from './services/tmdb.js'

export function createApp({
  frontendOrigin = readEnvironment().frontendOrigin,
  authenticate = clerkMiddleware({ authorizedParties: [frontendOrigin] }),
  readAuth = getAuth,
  getUser = (userId) => clerkClient.users.getUser(userId),
  countUsers = () => clerkClient.users.getCount(),
  favorites = favoriteService,
  movies = movieService,
  tmdb = createTmdbService({ token: readEnvironment().tmdbReadToken }),
  cinemaCurrency = readEnvironment().cinemaCurrency,
  inngestEnabled = readEnvironment().inngestEnabled,
  clerkWebhookSecret = readEnvironment().clerkWebhookSecret,
  sender = createEmailSender(),
  payments = createPaymentService({
    frontendOrigin,
    secretKey: readEnvironment().stripeSecretKey,
    webhookSecret: readEnvironment().stripeWebhookSecret,
  }),
} = {}) {
  const app = express()
  const requireAuth = createRequireAuth({ readAuth, getUser })
  if (!Intl.supportedValuesOf('currency').includes(cinemaCurrency)) {
    throw new Error('Set CINEMA_CURRENCY to a supported ISO currency code.')
  }

  app.use(cors({ origin: frontendOrigin }))
  app.use('/api/stripe/webhook', createStripeWebhookRouter(payments))
  if (clerkWebhookSecret) app.use('/api/webhooks/clerk', createClerkWebhookRouter(clerkWebhookSecret))
  if (inngestEnabled) app.use('/api/inngest', createInngestRouter({
    getUser, listUsers: (options) => clerkClient.users.getUserList(options), sender, frontendOrigin,
    closeExpiredCheckout: payments.closeExpiredCheckout,
  }))
  app.use('/api', healthRouter)
  app.use('/api/movies', createMoviesRouter(movies))
  app.get('/api/shows/:showId/seats', seatAvailability)
  app.use('/api/bookings', authenticate, createBookingsRouter(requireAuth))
  app.use('/api/checkout', authenticate, createCheckoutRouter(requireAuth, payments))
  app.use('/api/favorites', authenticate, createFavoritesRouter(requireAuth, favorites, movies))
  app.use('/api/users', authenticate, createUsersRouter(requireAuth))
  app.use('/api/admin', authenticate, createAdminRouter(requireAuth, {
    currency: cinemaCurrency,
    tmdb,
    dashboard: () => getDashboard(countUsers, cinemaCurrency),
    listShows: listShowsWithBookingCounts,
    scheduleShows: (input) => scheduleShows(input, cinemaCurrency, tmdb.fetchMovie),
  }))
  app.use(errorHandler)

  return app
}

export default createApp()
