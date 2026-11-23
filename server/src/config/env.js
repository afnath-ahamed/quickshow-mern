export function readEnvironment(env = process.env) {
  return {
    mongoUri: env.MONGODB_URI,
    port: env.PORT ?? '5000',
  }
}
