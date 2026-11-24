export function getCurrentUser(_request, response) {
  return response.json(response.locals.currentUser)
}
