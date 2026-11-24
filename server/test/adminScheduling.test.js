import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { parseSchedule } from '../src/services/showService.js'
import { createTmdbService } from '../src/services/tmdb.js'

test('converts Colombo date and time to UTC and rejects invalid batches', () => {
  const now = new Date('2030-02-01T00:00:00.000Z')
  const valid = { movieId: '324544', priceMinor: 125050, startsAt: ['2030-02-02T18:30', '2030-02-02T20:00'] }
  const result = parseSchedule(valid, now)
  assert.deepEqual(result.dates.map((date) => date.toISOString()), [
    '2030-02-02T13:00:00.000Z', '2030-02-02T14:30:00.000Z',
  ])
  for (const change of [
    { movieId: '../not-a-movie' },
    { priceMinor: 1.5 },
    { priceMinor: 0 },
    { startsAt: [] },
    { startsAt: Array(31).fill(valid.startsAt[0]) },
    { startsAt: ['2030-02-30T18:30'] },
    { startsAt: ['2030-01-31T18:30'] },
    { startsAt: ['2030-02-02T24:00'] },
    { startsAt: ['2030-02-02T18:30Z'] },
    { startsAt: [valid.startsAt[0], valid.startsAt[0]] },
  ]) {
    assert.ok(parseSchedule({ ...valid, ...change }, now).error, JSON.stringify(change))
  }
})

test('requires Clerk and a server-side admin role on all scheduling endpoints', async (t) => {
  const tmdb = {
    fetchNowPlaying: async (page) => ({ page, movies: [{ id: '324544', title: 'Test movie' }], totalPages: 3 }),
  }
  const app = createApp({
    tmdb,
    authenticate: (_request, _response, next) => next(),
    readAuth: (request) => {
      const id = request.get('X-Test-User')
      return { isAuthenticated: Boolean(id), userId: id }
    },
    getUser: async (id) => ({ privateMetadata: id === 'admin' ? { role: 'admin' } : {} }),
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api/admin'
  for (const [path, method] of [
    ['/dashboard', 'GET'], ['/movies/now-playing', 'GET'], ['/shows', 'GET'], ['/shows', 'POST'],
  ]) {
    assert.equal((await fetch(base + path, { method })).status, 401)
    assert.equal((await fetch(base + path, { method, headers: { 'X-Test-User': 'member' } })).status, 403)
  }

  const headers = { 'X-Test-User': 'admin', 'Content-Type': 'application/json' }
  const response = await fetch(base + '/movies/now-playing?page=2', { headers })
  assert.equal(response.status, 200)
  const page = await response.json()
  assert.equal(page.page, 2)
  assert.equal(page.timeZone, 'Asia/Colombo')
  assert.equal(page.movies[0].id, '324544')
  assert.equal((await fetch(base + '/movies/now-playing?page=0', { headers })).status, 400)
  for (const body of ['{', '{}']) {
    const invalid = await fetch(base + '/shows', { headers, method: 'POST', body })
    assert.equal(invalid.status, 400)
  }
})

test('normalizes TMDB details and safely handles configuration and upstream failures', async () => {
  const api = createTmdbService({
    token: 'test-token',
    fetchImpl: async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-token')
      assert.equal(url.origin, 'https://api.themoviedb.org')
      assert.equal(url.searchParams.get('append_to_response'), 'credits,videos')
      return Response.json({
        id: 324544, title: 'Test movie', poster_path: '/poster.jpg',
        credits: { cast: [{ name: 'Test actor', profile_path: null }] },
        videos: { results: [{ key: 'abcDEF012_3', official: true, site: 'YouTube', type: 'Trailer' }] },
      })
    },
  })
  const movie = await api.fetchMovie('324544')
  assert.equal(movie.tmdbId, '324544')
  assert.equal(movie.posterUrl, 'https://image.tmdb.org/t/p/w500/poster.jpg')
  assert.deepEqual(movie.cast, [{ name: 'Test actor', imageUrl: '' }])
  assert.equal(movie.trailerId, 'abcDEF012_3')

  await assert.rejects(createTmdbService({}).fetchNowPlaying(1), { status: 503 })
  const badToken = createTmdbService({ token: 'test-token', fetchImpl: async () => new Response(null, { status: 401 }) })
  await assert.rejects(badToken.fetchNowPlaying(1), { status: 502, message: 'TMDB is temporarily unavailable. Try again.' })
})
