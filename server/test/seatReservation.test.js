import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import test from 'node:test'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import Booking from '../src/models/Booking.js'
import Movie from '../src/models/Movie.js'
import SeatClaim from '../src/models/SeatClaim.js'
import Show from '../src/models/Show.js'

test('seat holds are atomic, idempotent, private, and expire', { timeout: 180_000 }, async (t) => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  t.after(async () => {
    await mongoose.disconnect()
    await mongo.stop()
  })
  await mongoose.connect(mongo.getUri())
  await Promise.all([Movie.init(), Show.init(), Booking.init(), SeatClaim.init()])
  const movie = await Movie.create({ tmdbId: '324544', title: 'Seat Booking Test', runtime: 127 })
  const createShow = (milliseconds) => Show.create({
    movie: movie._id, startsAt: new Date(Date.now() + milliseconds), priceMinor: 125050, currency: 'LKR',
  })
  const show = await createShow(60 * 60_000)
  const nextShow = await createShow(120 * 60_000)

  const app = createApp({
    countUsers: async () => 3,
    authenticate: (_request, _response, next) => next(),
    readAuth: (request) => {
      const userId = request.get('X-Test-User')
      return { isAuthenticated: Boolean(userId), userId }
    },
    getUser: async (id) => ({ firstName: id, privateMetadata: { role: id === 'admin' ? 'admin' : 'user' } }),
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api'

  async function call(path, user, payload) {
    const headers = user ? { 'X-Test-User': user } : {}
    if (payload) headers['Content-Type'] = 'application/json'
    const response = await fetch(base + path, {
      headers, ...(payload && { method: 'POST', body: JSON.stringify(payload) }),
    })
    return { status: response.status, body: await response.json() }
  }

  const hold = (user, seats, options = {}) => call('/bookings', user, {
    showId: show.id, seats, requestId: randomUUID(), ...options,
  })
  const availability = async (showId = show.id) => (await call('/shows/' + showId + '/seats')).body

  await t.test('requires authentication and validates screening, selection, and request ID', async () => {
    assert.equal((await hold(undefined, ['A1'])).status, 401)
    assert.equal((await call('/bookings/me')).status, 401)
    assert.equal((await call('/admin/bookings', 'alice')).status, 403)
    assert.equal((await call('/admin/bookings?showId=invalid', 'admin')).status, 404)
    assert.equal((await hold('alice', ['K1'])).status, 400)
    assert.equal((await hold('alice', ['A1', 'A1'])).status, 400)
    assert.equal((await hold('alice', ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'])).status, 400)
    assert.equal((await hold('alice', ['A1'], { requestId: 'invalid' })).status, 400)
    assert.equal((await hold('alice', ['A1'], { showId: 'missing' })).status, 404)
    const past = await createShow(-60_000)
    assert.equal((await call('/shows/' + past.id + '/seats')).status, 410)
    assert.equal((await hold('alice', ['A1'], { showId: past.id })).status, 410)
    assert.equal((await availability()).rows.flatMap(({ seats }) => seats).length, 90)
  })

  await t.test('concurrent requests cannot double-book or keep the rest of a conflicting batch', async () => {
    const results = await Promise.all([
      hold('alice', ['A1', 'A3']),
      hold('bob', ['A2', 'A3']),
    ])
    const winner = results.findIndex(({ status }) => status === 201)
    assert.ok(winner >= 0)
    const losingRequest = results[1 - winner]
    assert.equal(losingRequest.status, 409)
    assert.equal(losingRequest.body.code, 'SEATS_UNAVAILABLE')
    const winningBooking = results[winner].body.booking
    assert.equal(winningBooking.totalMinor, 250100)
    assert.equal(winningBooking.runtime, 127)
    const blocked = (await availability()).unavailable.sort()
    assert.deepEqual(blocked, winningBooking.seats)
    assert.equal(await Booking.countDocuments({ show: show._id }), 1)
    assert.equal((await hold('alice', ['A3'], { showId: nextShow.id })).status, 201)
  })

  await t.test('concurrent retries return the same record and reject a changed payload', async () => {
    const requestId = randomUUID()
    const options = { requestId }
    const replies = await Promise.all([
      hold('alice', ['B2', 'B1'], options),
      hold('alice', ['B1', 'B2'], options),
    ])
    assert.deepEqual(replies.map(({ status }) => status).sort(), [200, 201])
    assert.equal(replies[0].body.booking.id, replies[1].body.booking.id)
    assert.equal(replies[0].body.booking.expiresAt, replies[1].body.booking.expiresAt)
    assert.equal((await hold('alice', ['B3'], options)).body.code, 'REQUEST_ID_REUSED')
    assert.equal((await hold('bob', ['B3'], options)).status, 201)
  })

  await t.test('expired claims become available and remain in the owner history', async () => {
    const key = randomUUID()
    const original = (await hold('alice', ['C1'], { requestId: key })).body.booking
    const expiry = new Date(Date.now() - 1000)
    await Booking.findByIdAndUpdate(original.id, { expiresAt: expiry })
    await SeatClaim.updateOne({ booking: original.id }, { expiresAt: expiry })
    assert.equal((await availability()).unavailable.includes('C1'), false)
    assert.equal((await hold('bob', ['C1'])).status, 201)

    const alice = await call('/bookings/me?userId=bob', 'alice')
    const bob = await call('/bookings/me', 'bob')
    assert.equal(alice.body.bookings.find(({ id }) => id === original.id).status, 'expired')
    assert.equal(bob.body.bookings.some(({ id }) => id === original.id), false)
    assert.equal((await hold('alice', ['C1'], { requestId: key })).body.booking.status, 'expired')

    const admin = await call('/admin/bookings?showId=' + show.id, 'admin')
    assert.equal(admin.status, 200)
    assert.ok(admin.body.bookings.every(({ showId }) => showId === show.id))
    assert.ok(admin.body.bookings.some(({ customerName }) => customerName === 'bob'))
    const dashboard = (await call('/admin/dashboard', 'admin')).body
    assert.equal(dashboard.bookingCounts.confirmed, 0)
    const summary = dashboard.upcoming.find(({ id }) => id === show.id).bookingCounts
    assert.equal(summary.holds, admin.body.bookings.filter(({ status }) => status === 'held').length)
  })

  await t.test('a hold lasts up to ten minutes and ends at the screening if that is sooner', async () => {
    const before = Date.now()
    const booked = (await hold('bob', ['D1'])).body.booking
    const expiry = Date.parse(booked.expiresAt)
    assert.ok(expiry >= before + 600_000 && expiry <= Date.now() + 600_000)
    const soon = await createShow(90_000)
    const short = (await hold('bob', ['D2'], { showId: soon.id })).body.booking
    assert.equal(short.expiresAt, soon.startsAt.toISOString())
  })

  await t.test('booking history returns movie runtime for older reservations and preserves new snapshots', async () => {
    const older = (await hold('charlie', ['E1'])).body.booking
    const current = (await hold('charlie', ['E2', 'E3'])).body.booking
    await Booking.findByIdAndUpdate(older.id, { $unset: { runtime: 1 } })
    try {
      await Movie.findByIdAndUpdate(movie.id, { runtime: 130 })
      const { body } = await call('/bookings/me', 'charlie')
      assert.equal(body.bookings.find(({ id }) => id === older.id).runtime, 130)
      assert.equal(body.bookings.find(({ id }) => id === current.id).runtime, 127)
      await Movie.findByIdAndUpdate(movie.id, { $unset: { runtime: 1 } })
      const missing = await call('/bookings/me', 'charlie')
      assert.equal(missing.body.bookings.find(({ id }) => id === older.id).runtime, undefined)
    } finally {
      await Movie.findByIdAndUpdate(movie.id, { runtime: 127 })
    }
  })
})
