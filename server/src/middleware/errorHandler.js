export function errorHandler(error, _request, response, next) {
  if (response.headersSent) {
    return next(error)
  }

  return response.status(500).json({ message: 'Internal server error.' })
}
