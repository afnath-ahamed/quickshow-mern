import mongoose from 'mongoose'
import Stripe from 'stripe'
import Booking from '../models/Booking.js'
import { queueJob } from '../models/NotificationJob.js'
import Payment from '../models/Payment.js'
import SeatClaim from '../models/SeatClaim.js'
import { reminderLeadMs } from '../jobs/sendBookingConfirmation.js'

export class PaymentError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const refundStates = new Set(['refund_pending', 'refunded', 'refund_failed'])

async function findOwnedBooking(userId, id) {
  if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id)) {
    throw new PaymentError('Booking not found.', 404)
  }
  const booking = await Booking.findOne({ _id: new mongoose.Types.ObjectId(String(id)), userId }).lean()
  if (!booking) throw new PaymentError('Booking not found.', 404)
  return booking
}

function isActive(booking, now = new Date()) {
  return booking.status === 'held' && booking.expiresAt > now && booking.startsAt > now
}

function seatFilter(booking) {
  return { booking: booking._id, show: booking.show, seat: { $in: booking.seats }, status: 'held' }
}

async function recordPayment(booking) {
  const filter = { booking: booking._id }
  try {
    return await Payment.findOneAndUpdate(filter, {
      $setOnInsert: {
        show: booking.show, amountMinor: booking.priceMinor * booking.seats.length,
        currency: booking.currency, state: 'started',
      },
    }, { upsert: true, returnDocument: 'after', runValidators: true }).lean()
  } catch (error) {
    if (error.code !== 11000) throw error
    const payment = await Payment.findOne(filter).lean()
    if (!payment) throw error
    return payment
  }
}

function checkoutLink(session) {
  if (session.status === 'complete') return { status: 'processing' }
  if (session.status !== 'open' || !session.url) {
    throw new PaymentError('This checkout session has closed. Select seats again after the hold expires.', 409)
  }
  const url = new URL(session.url)
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
    throw new PaymentError('Stripe returned an unexpected checkout address.', 502)
  }
  return { status: 'open', url: url.href }
}

function refundState(refund) {
  if (refund.status === 'succeeded') return 'refunded'
  if (refund.status === 'failed' || refund.status === 'canceled') return 'refund_failed'
  return 'refund_pending'
}

export function createPaymentService({ secretKey, webhookSecret, frontendOrigin, stripe: suppliedStripe }) {
  const stripe = suppliedStripe ?? (/^(sk|rk)_test_/.test(secretKey ?? '')
    ? new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 10_000 })
    : null)

  function requireStripe() {
    if (!stripe || !webhookSecret) throw new PaymentError('Stripe sandbox checkout is not configured.', 503)
  }

  async function expireOpenSession(payment) {
    if (!stripe || payment?.state !== 'started' || payment.sessionClosed || !payment.sessionId) return
    try {
      await stripe.checkout.sessions.expire(payment.sessionId)
      await Payment.updateOne({ _id: payment._id, state: 'started' }, { $set: { sessionClosed: true } })
    } catch {
      // A completed session cannot be expired. Its verified event handles confirmation or refund.
    }
  }

  async function closeExpiredCheckout(booking) {
    const payment = await Payment.findOne({ booking: booking._id }).lean()
    if (!payment || refundStates.has(payment.state)) return true
    if (payment.state === 'confirmed') return false
    if (!payment.sessionId) return Date.now() - +payment.createdAt > 2 * 60_000
    if (payment.sessionClosed) return true
    if (!stripe) return false

    await expireOpenSession(payment)
    const checkout = await stripe.checkout.sessions.retrieve(payment.sessionId)
      .catch(() => { throw new Error('Stripe Checkout status could not be verified.') })
    if (checkout.status === 'complete') return booking.startsAt <= new Date()
    return checkout.status === 'expired'
  }

  async function createCheckout(userId, bookingId) {
    const booking = await findOwnedBooking(userId, bookingId)
    if (booking.status === 'confirmed') return { status: 'processing' }
    if (!isActive(booking)) {
      await expireOpenSession(await Payment.findOne({ booking: booking._id }).lean())
      throw new PaymentError('This seat hold has expired.', 409)
    }
    requireStripe()
    const claims = await SeatClaim.countDocuments({ ...seatFilter(booking), expiresAt: { $gt: new Date() } })
    if (claims !== booking.seats.length || !isActive(booking)) throw new PaymentError('This seat hold is unavailable.', 409)

    const payment = await recordPayment(booking)
    if (payment.state !== 'started') return { status: 'processing' }
    let checkout
    try {
      if (payment.sessionId) {
        checkout = await stripe.checkout.sessions.retrieve(payment.sessionId)
      } else {
        const result = new URL('/checkout/result', frontendOrigin)
        result.searchParams.set('bookingId', String(booking._id))
        const cancel = new URL(result)
        cancel.searchParams.set('cancelled', '1')
        checkout = await stripe.checkout.sessions.create({
          mode: 'payment',
          adaptive_pricing: { enabled: false },
          allowed_payment_method_types: ['card'],
          client_reference_id: String(booking._id),
          metadata: { paymentId: String(payment._id) },
          success_url: result.href,
          cancel_url: cancel.href,
          expires_at: Math.ceil(payment.createdAt.getTime() / 1000) + 45 * 60,
          line_items: [{
            quantity: booking.seats.length,
            price_data: {
              currency: payment.currency.toLowerCase(),
              unit_amount: booking.priceMinor,
              product_data: { name: booking.title },
            },
          }],
        }, { idempotencyKey: 'quickshow-checkout-' + payment._id })
        await Payment.updateOne({ _id: payment._id, sessionId: { $exists: false } }, { $set: { sessionId: checkout.id } })
      }
    } catch {
      throw new PaymentError('Could not open Stripe Checkout. Try again while your hold is active.', 502)
    }

    const current = await findOwnedBooking(userId, bookingId)
    if (current.status === 'confirmed') return { status: 'processing' }
    if (!isActive(current)) {
      await expireOpenSession({ ...payment, sessionId: checkout.id })
      throw new PaymentError('This seat hold has expired.', 409)
    }
    return checkoutLink(checkout)
  }

  async function getCheckoutStatus(userId, bookingId) {
    const booking = await findOwnedBooking(userId, bookingId)
    const payment = await Payment.findOne({ booking: booking._id }).lean()
    if (booking.status === 'confirmed') return { status: 'confirmed' }
    if (refundStates.has(payment?.state)) return { status: payment.state }
    if (isActive(booking)) return { status: 'held' }
    await expireOpenSession(payment)
    return { status: 'expired' }
  }

  async function updateRefund(payment, refund) {
    const state = refundState(refund)
    const eligible = state === 'refunded' ? ['refund_pending', 'refund_failed'] : ['refund_pending']
    await Payment.updateOne(
      { _id: payment._id, state: { $in: eligible } },
      { $set: { refundId: refund.id, state } },
    )
  }

  async function sendRefund(payment) {
    if (payment.refundId) return
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
      metadata: { paymentId: String(payment._id) },
    }, { idempotencyKey: 'quickshow-refund-' + payment.paymentIntentId })
    await updateRefund(payment, refund)
  }

  async function handleCompleted(event) {
    const checkout = event.data.object
    const paymentId = checkout.metadata?.paymentId
    if (checkout.status !== 'complete' || checkout.payment_status !== 'paid' ||
        checkout.mode !== 'payment' || typeof checkout.id !== 'string' ||
        !mongoose.isObjectIdOrHexString(paymentId) || typeof checkout.payment_intent !== 'string' ||
        !Number.isSafeInteger(event.created)) return

    const paidAt = new Date(event.created * 1000)
    const refund = await mongoose.connection.transaction(async (session) => {
      const payment = await Payment.findById(new mongoose.Types.ObjectId(String(paymentId))).session(session)
      if (!payment || String(payment.booking) !== checkout.client_reference_id ||
          (payment.sessionId && payment.sessionId !== checkout.id) ||
          (payment.paymentIntentId && payment.paymentIntentId !== checkout.payment_intent)) return null
      if (payment.state === 'refund_pending') return payment.toObject()
      if (payment.state !== 'started') return null

      const booking = await Booking.findById(payment.booking).session(session)
      payment.sessionId = checkout.id
      payment.paymentIntentId = checkout.payment_intent
      payment.sessionClosed = true
      payment.paidAt = paidAt

      const eligible = booking?.status === 'held' && paidAt < booking.expiresAt && paidAt < booking.startsAt &&
        Date.now() < booking.startsAt.getTime() &&
        checkout.amount_total === payment.amountMinor && checkout.currency === payment.currency.toLowerCase()
      if (eligible) {
        const claims = seatFilter(booking)
        if (await SeatClaim.countDocuments(claims).session(session) === booking.seats.length) {
          await SeatClaim.updateMany(claims, { $set: { status: 'confirmed' } }, { session })
          booking.status = 'confirmed'
          await booking.save({ session })
          payment.state = 'confirmed'
          await queueJob({ id: 'confirmation:' + booking.id, kind: 'confirmation', reference: booking.id }, session)
          await queueJob({
            id: 'reminder:' + booking.id, kind: 'reminder', reference: booking.id,
            dueAt: new Date(Math.max(Date.now(), +booking.startsAt - reminderLeadMs)),
          }, session)
        }
      }
      if (payment.state !== 'confirmed') {
        payment.state = 'refund_pending'
        if (booking?.status === 'held') {
          booking.status = 'expired'
          await booking.save({ session })
          await SeatClaim.deleteMany(seatFilter(booking), { session })
        }
      }
      await payment.save({ session })
      return payment.state === 'refund_pending' ? payment.toObject() : null
    })
    // Keep the refund outside the transaction. A delivery retry uses the same provider idempotency key.
    if (refund) await sendRefund(refund)
  }

  async function handleRefundEvent(refund) {
    const id = refund.metadata?.paymentId
    if (!mongoose.isObjectIdOrHexString(id) || typeof refund.payment_intent !== 'string') return
    const payment = await Payment.findById(new mongoose.Types.ObjectId(String(id))).lean()
    if (payment?.paymentIntentId !== refund.payment_intent || (payment.refundId && payment.refundId !== refund.id)) return
    await updateRefund(payment, refund)
  }

  async function handleWebhook(rawBody, signature) {
    requireStripe()
    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch {
      throw new PaymentError('Invalid Stripe webhook signature.', 400)
    }
    if (event.livemode !== false) throw new PaymentError('Expected a Stripe sandbox event.', 400)
    if (event.type === 'checkout.session.completed') await handleCompleted(event)
    if (event.type === 'refund.updated' || event.type === 'refund.failed') await handleRefundEvent(event.data.object)
  }

  return { createCheckout, getCheckoutStatus, handleWebhook, closeExpiredCheckout }
}

export async function getRevenue(showIds) {
  const filter = { state: 'confirmed' }
  if (showIds) filter.show = { $in: showIds.map((id) => new mongoose.Types.ObjectId(id)) }
  const rows = await Payment.aggregate([
    { $match: filter },
    { $group: {
      _id: { currency: '$currency', show: showIds ? '$show' : null },
      amountMinor: { $sum: '$amountMinor' },
    } },
    { $sort: { '_id.currency': 1 } },
  ])
  if (!showIds) return rows.map(({ _id, amountMinor }) => ({ currency: _id.currency, amountMinor }))
  const perShow = new Map()
  for (const { _id, amountMinor } of rows) {
    const id = String(_id.show)
    const totals = perShow.get(id) ?? []
    totals.push({ currency: _id.currency, amountMinor })
    perShow.set(id, totals)
  }
  return perShow
}
