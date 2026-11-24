export default function createCheckoutController(payments) {
  return {
    async start(request, response) {
      return response.json(await payments.createCheckout(response.locals.currentUser.userId, request.params.bookingId))
    },
    async status(request, response) {
      return response.json(await payments.getCheckoutStatus(response.locals.currentUser.userId, request.params.bookingId))
    },
  }
}
