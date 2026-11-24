export function requireAdmin(_request, response, next) {
  if (!response.locals.currentUser) {
    return response.status(401).json({ message: 'Sign in to continue.' })
  }

  if (response.locals.currentUser.role !== 'admin') {
    return response.status(403).json({ message: 'Admin access required.' })
  }

  next()
}
