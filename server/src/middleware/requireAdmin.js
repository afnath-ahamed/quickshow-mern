export function requireAdmin(_request, response) {
  return response.status(501).json({ message: 'Access checks are pending implementation.' })
}
