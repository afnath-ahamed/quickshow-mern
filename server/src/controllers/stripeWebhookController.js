export default function createStripeWebhookController(payments) {
  return async function handleStripeWebhook(request, response) {
    await payments.handleWebhook(request.body, request.get('Stripe-Signature'))
    return response.sendStatus(200)
  }
}
