export function createRequireAuth({ readAuth, getUser }) {
  return async function requireAuth(request, response, next) {
    response.set('Cache-Control', 'no-store')
    const { isAuthenticated, userId } = readAuth(request)

    if (!isAuthenticated || !userId) {
      return response.status(401).json({ message: 'Sign in to continue.' })
    }

    let user
    try {
      user = await getUser(userId)
    } catch {
      return response.status(503).json({ message: 'Account access could not be verified.' })
    }

    response.locals.currentUser = {
      userId,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
      role: user.privateMetadata?.role === 'admin' ? 'admin' : 'user',
    }
    next()
  }
}
