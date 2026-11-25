import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import test from 'node:test'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import Stripe from 'stripe'
import { createApp } from '../src/app.js'
import { releaseExpiredSeats } from '../src/jobs/releaseExpiredSeats.js'
import Booking from '../src/models/Booking.js'
import Movie from '../src/models/Movie.js'
import NotificationJob from '../src/models/NotificationJob.js'
import Payment from '../src/models/Payment.js'
import SeatClaim from '../src/models/SeatClaim.js'
import Show from '../src/models/Show.js'
import { createPaymentService } from '../src/services/paymentService.js'

const webhookSecret = 'whsec_local_test_signature_only'
const sdk = new Stripe('sk_test_local_signature_only')
const frontendOrigin = 'http://localhost:5173'

test('Stripe Checkout uses signed events, atomic fulfillment, and recoverable refunds', { timeout: 180_000 }, async (t) => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  t.after(async () => {
    await mongoose.disconnect()
    await mongo.stop()
  })
  await mongoose.connect(mongo.getUri())
  await Promise.all([Booking.init(), Movie.init(), Payment.init(), SeatClaim.init(), Show.init()])
  const movie = await Movie.create({ tmdbId: '324544', title: 'Stripe Checkout Test' })
  const show = await Show.create({
    movie: movie._id, startsAt: new Date(Date.now() + 60 * 60_000), priceMinor: 125050, currency: 'LKR',
  })

  const sessions = new Map()
  const checkouts = new Map()
  const refunds = new Map()
  let refundFailure = false
  let refundStatus = 'succeeded'
  const stripe = {
    webhooks: sdk.webhooks,
    checkout: { sessions: {
      async create(input, options) {
        assert.equal(input.line_items[0].price_data.unit_amount, show.priceMinor)
        assert.equal(input.line_items[0].price_data.currency, 'lkr')
        assert.equal(input.adaptive_pricing.enabled, false)
        assert.deepEqual(input.allowed_payment_method_types, ['card'])
        assert.equal(new URL(input.success_url).origin, frontendOrigin)
        assert.equal(new URL(input.cancel_url).searchParams.get('cancelled'), '1')
        if (checkouts.has(options.idempotencyKey)) return checkouts.get(options.idempotencyKey)
        const id = 'cs_test_' + randomUUID()
        const session = {
          id, url: 'https://checkout.stripe.com/c/pay/' + id,
          status: 'open', mode: 'payment', payment_status: 'unpaid',
          amount_total: input.line_items[0].quantity * show.priceMinor, currency: 'lkr',
          client_reference_id: input.client_reference_id, metadata: input.metadata,
        }
        sessions.set(id, session)
        checkouts.set(options.idempotencyKey, session)
        return session
      },
      async retrieve(id) { return sessions.get(id) },
      async expire(id) {
        const session = sessions.get(id)
        if (session.status !== 'open') throw new Error('Session is closed')
        session.status = 'expired'
        return session
      },
    } },
    refunds: { async create(input, options) {
      if (refundFailure) throw new Error('Temporary failure')
      if (refunds.has(options.idempotencyKey)) return refunds.get(options.idempotencyKey)
      const refund = { id: 're_' + randomUUID(), status: refundStatus, ...input }
      refunds.set(options.idempotencyKey, refund)
      return refund
    } },
  }
  const payments = createPaymentService({ stripe, webhookSecret, frontendOrigin })
  const app = createApp({
    payments,
    countUsers: async () => 3,
    authenticate: (_request, _response, next) => next(),
    readAuth: (request) => {
      const userId = request.get('X-Test-User')
      return { isAuthenticated: Boolean(userId), userId }
    },
    getUser: async (id) => ({ privateMetadata: { role: id === 'admin' ? 'admin' : 'user' } }),
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api'

  async function call(path, { user, method = 'GET', body, raw, signature } = {}) {
    const headers = new Headers()
    if (user) headers.set('X-Test-User', user)
    if (signature) headers.set('Stripe-Signature', signature)
    if (body || raw) headers.set('Content-Type', 'application/json')
    const response = await fetch(base + path, { method, headers, body: raw ?? JSON.stringify(body) })
    const detail = response.headers.get('content-type')?.includes('json') ? await response.json() : null
    return { status: response.status, body: detail }
  }

  const hold = async (seat, user = 'alice') => {
    const response = await call('/bookings', {
      user, method: 'POST', body: { showId: show.id, requestId: randomUUID(), seats: [seat] },
    })
    assert.equal(response.status, 201)
    return response.body.booking
  }
  const start = (id, user = 'alice') => call('/checkout/' + id, { method: 'POST', user })
  const status = (id, user = 'alice') => call('/checkout/' + id, { user })

  async function complete(id, fields = {}, created = Math.floor(Date.now() / 1000)) {
    const payment = await Payment.findOne({ booking: id }).lean()
    const session = sessions.get(payment.sessionId)
    session.status = 'complete'
    session.payment_intent ??= 'pi_' + randomUUID()
    return {
      id: 'evt_' + randomUUID(), type: 'checkout.session.completed', livemode: false, created,
      data: { object: { ...session, payment_status: 'paid', ...fields } },
    }
  }

  function send(event, invalid = false) {
    const raw = JSON.stringify(event)
    const signature = sdk.webhooks.generateTestHeaderString({ payload: raw, secret: invalid ? 'whsec_wrong' : webhookSecret })
    return call('/stripe/webhook', { method: 'POST', raw, signature })
  }

  async function expire(id) {
    const expiresAt = new Date(Date.now() - 2000)
    await Booking.findByIdAndUpdate(id, { expiresAt })
    await SeatClaim.updateMany({ booking: id }, { expiresAt })
    return expiresAt
  }

  await t.test('ownership, duplicate clicks, cancellation and signature checks', async () => {
    const booking = await hold('A1')
    assert.equal((await call('/checkout/' + booking.id, { method: 'POST' })).status, 401)
    assert.equal((await start(booking.id, 'bob')).status, 404)
    assert.equal((await status(booking.id, 'bob')).status, 404)
    const results = await Promise.all([start(booking.id), start(booking.id)])
    assert.deepEqual(results.map(({ status }) => status), [200, 200])
    assert.equal(results[0].body.url, results[1].body.url)
    assert.equal(checkouts.size, 1)
    assert.equal((await status(booking.id)).body.status, 'held')
    assert.equal((await start(booking.id)).body.url, results[0].body.url)
    assert.equal((await Booking.findById(booking.id)).expiresAt.toISOString(), booking.expiresAt)

    const wrongSignature = await send(await complete(booking.id), true)
    assert.equal(wrongSignature.status, 400)
    assert.equal((await status(booking.id)).body.status, 'held')
  })

  await t.test('a paid session confirms atomically and counts toward revenue once', async () => {
    const booking = await hold('A2')
    assert.equal((await start(booking.id)).status, 200)
    const unpaid = await complete(booking.id, { payment_status: 'unpaid' })
    assert.equal((await send(unpaid)).status, 200)
    assert.equal((await status(booking.id)).body.status, 'held')
    const event = await complete(booking.id)
    const deliveries = await Promise.all([send(event), send(event)])
    assert.deepEqual(deliveries.map(({ status }) => status), [200, 200])
    assert.equal((await send({ ...event, id: 'evt_out_of_order' })).status, 200)
    assert.equal((await status(booking.id)).body.status, 'confirmed')
    assert.equal((await SeatClaim.findOne({ booking: booking.id })).status, 'confirmed')
    const jobs = await NotificationJob.find({ reference: booking.id, kind: { $in: ['confirmation', 'reminder'] } }).lean()
    assert.deepEqual(jobs.map(({ kind }) => kind).sort(), ['confirmation', 'reminder'])
    assert.ok(jobs.find(({ kind }) => kind === 'reminder').dueAt < show.startsAt)
    const dashboard = await call('/admin/dashboard', { user: 'admin' })
    assert.deepEqual(dashboard.body.revenue, [{ currency: 'LKR', amountMinor: show.priceMinor }])
    assert.deepEqual(dashboard.body.upcoming[0].revenue, dashboard.body.revenue)
  })

  await t.test('expired checkout is closed when detected and disallows new payment links', async () => {
    const booking = await hold('A3')
    await start(booking.id)
    const { sessionId } = await Payment.findOne({ booking: booking.id })
    await expire(booking.id)
    assert.equal((await start(booking.id)).status, 409)
    assert.equal((await status(booking.id)).body.status, 'expired')
    assert.equal(sessions.get(sessionId).status, 'expired')
  })

  await t.test('on-time payment with late delivery confirms if the hold still owns the seat', async () => {
    const booking = await hold('B1')
    await start(booking.id)
    const expiry = await expire(booking.id)
    const event = await complete(booking.id, {}, Math.floor(expiry.getTime() / 1000) - 1)
    assert.ok(await releaseExpiredSeats(booking.id, payments.closeExpiredCheckout) > new Date())
    assert.equal((await SeatClaim.findOne({ booking: booking.id })).status, 'held')
    assert.equal((await send(event)).status, 200)
    assert.equal((await status(booking.id)).body.status, 'confirmed')
  })

  await t.test('a late payment is refunded, without touching a new owner even if refund is retried', async () => {
    const booking = await hold('B2')
    await start(booking.id)
    await expire(booking.id)
    const other = await hold('B2', 'bob')
    const event = await complete(booking.id)
    refundFailure = true
    try {
      assert.equal((await send(event)).status, 500)
      assert.equal((await status(booking.id)).body.status, 'refund_pending')
    } finally { refundFailure = false }
    const previous = refunds.size
    assert.equal((await send(event)).status, 200)
    assert.equal((await send(event)).status, 200)
    assert.equal(refunds.size, previous + 1)
    assert.equal((await status(booking.id)).body.status, 'refunded')
    assert.equal(String((await SeatClaim.findOne({ show: show.id, seat: 'B2' })).booking), other.id)
  })

  await t.test('even an on-time payment is refunded if a delayed event finds reassigned seats', async () => {
    const booking = await hold('C1')
    await start(booking.id)
    const expiry = await expire(booking.id)
    const other = await hold('C1', 'bob')
    const event = await complete(booking.id, {}, Math.floor(expiry.getTime() / 1000) - 1)
    assert.equal((await send(event)).status, 200)
    assert.equal((await status(booking.id)).body.status, 'refunded')
    assert.equal(String((await SeatClaim.findOne({ show: show.id, seat: 'C1' })).booking), other.id)
  })

  await t.test('amount mismatch releases the hold and asynchronous refund status is tracked', async () => {
    const booking = await hold('B3')
    await start(booking.id)
    const event = await complete(booking.id, { amount_total: show.priceMinor - 1 })
    refundStatus = 'pending'
    try {
      assert.equal((await send(event)).status, 200)
    } finally { refundStatus = 'succeeded' }
    assert.equal((await status(booking.id)).body.status, 'refund_pending')
    assert.equal(await SeatClaim.countDocuments({ booking: booking.id }), 0)
    const refund = [...refunds.values()].find(({ payment_intent }) => payment_intent === event.data.object.payment_intent)
    assert.equal((await send({
      type: 'refund.updated', livemode: false, data: { object: { ...refund, status: 'succeeded' } },
    })).status, 200)
    assert.equal((await status(booking.id)).body.status, 'refunded')
    assert.deepEqual((await call('/admin/dashboard', { user: 'admin' })).body.revenue,
      [{ currency: 'LKR', amountMinor: show.priceMinor * 2 }])
  })
})
