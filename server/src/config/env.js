export function readEnvironment(env = process.env) {
  return {
    mongoUri: env.MONGODB_URI,
    port: env.PORT ?? '5000',
    frontendOrigin: env.FRONTEND_ORIGIN || 'http://localhost:5173',
    tmdbReadToken: env.TMDB_READ_TOKEN?.trim(),
    cinemaCurrency: env.CINEMA_CURRENCY?.trim().toUpperCase() || 'LKR',
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim(),
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim(),
    inngestEnabled: env.INNGEST_DEV === '1' || env.INNGEST_DEV === 'true' ||
      Boolean(env.INNGEST_EVENT_KEY?.trim() && env.INNGEST_SIGNING_KEY?.trim()),
    clerkWebhookSecret: env.CLERK_WEBHOOK_SIGNING_SECRET?.trim(),
  }
}
