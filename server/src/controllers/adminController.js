export function getAdminAccess(_request, response) {
  return response.json({ role: 'admin' })
}

export function getDashboard(_request, response) {
  return response.status(501).json({ message: 'This endpoint is pending implementation.' })
}
