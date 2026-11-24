import { TmdbError } from '../services/tmdb.js'

export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error)

  // Forward fixed application messages for expected integration failures.
  if (error instanceof TmdbError) {
    return response.status(error.status).json({ message: error.message })
  }
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Send a valid JSON request.' })
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ message: 'This request is too large.' })
  }
  return response.status(500).json({ message: 'Internal server error.' })
}
