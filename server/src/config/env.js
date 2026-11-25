export function readEnvironment(env = process.env) {
  return {
    mongoUri: env.MONGODB_URI,
    port: env.PORT ?? '5000',
    frontendOrigin: env.FRONTEND_ORIGIN || 'http://localhost:5173',
    tmdbReadToken: env.TMDB_READ_TOKEN?.trim(),
    cinemaCurrency: env.CINEMA_CURRENCY?.trim().toUpperCase() || 'LKR',
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim(),
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim(),
  }
}
