import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../src/app.js'
import catalog from '../src/data/sampleCatalog.json' with { type: 'json' }

async function startApi(t) {
  const saved = new Map()
  const app = createApp({
    frontendOrigin: 'http://localhost:5173',
    authenticate: (_request, _response, next) => next(),
    readAuth: (request) => {
      const token = request.get('Authorization')
      const userId = ['Bearer alice', 'Bearer bob'].includes(token) ? token.slice(7) : undefined
      return { isAuthenticated: Boolean(userId), userId }
    },
    getUser: async () => ({ privateMetadata: {} }),
    movies: {
      listMovies: async () => catalog.movies,
      listTrailers: () => catalog.trailers,
      findMovie: async (id) => {
        const movie = catalog.movies.find((item) => item.id === id)
        return movie ? { ...movie, showtimes: [] } : null
      },
      movieExists: async (id) => catalog.movies.some((movie) => movie.id === id),
      listSavedMovies: async (ids) => catalog.movies.filter(({ id }) => ids.includes(id)),
    },
    favorites: {
      listFavorites: async (userId) => [...(saved.get(userId) ?? [])],
      saveFavorite: async (userId, movieId) => {
        const movies = saved.get(userId) ?? new Set()
        movies.add(movieId)
        saved.set(userId, movies)
      },
      removeFavorite: async (userId, movieId) => saved.get(userId)?.delete(movieId),
    },
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  }))
  const base = 'http://127.0.0.1:' + server.address().port
  return (path, options) => fetch(base + '/api' + path, options)
}

test('public catalog lists movies and resolves a valid detail route without scheduled shows', async (t) => {
  const request = await startApi(t)
  const response = await request('/movies')
  assert.equal(response.status, 200)
  const { movies, trailers } = await response.json()
  assert.ok(movies.length > 4)
  assert.equal(new Set(movies.map(({ id }) => id)).size, movies.length)
  assert.ok(trailers.length > 1)

  const detail = await request('/movies/' + movies[0].id)
  assert.equal(detail.status, 200)
  const { movie } = await detail.json()
  assert.equal(movie.title, movies[0].title)
  assert.equal(movie.originalLanguage, 'en')
  assert.ok(movie.cast.length)
  assert.deepEqual(movie.showtimes, [])
  assert.equal((await request('/movies/unknown')).status, 404)
})

test('all favorites endpoints require sign-in', async (t) => {
  const request = await startApi(t)
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const path = method === 'GET' ? '/favorites' : '/favorites/324544'
    assert.equal((await request(path, { method })).status, 401)
  }
})

test('favorite changes belong to the authenticated account', async (t) => {
  const request = await startApi(t)
  const alice = { Authorization: 'Bearer alice' }
  const bob = { Authorization: 'Bearer bob' }
  const moviePath = '/favorites/324544'
  const list = async (headers) => {
    const response = await request('/favorites', { headers })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const { movieIds, movies } = await response.json()
    assert.deepEqual(movies.map((movie) => movie.id), movieIds)
    return movieIds
  }
  assert.equal((await request('/favorites/unknown', { method: 'PUT', headers: alice })).status, 404)
  assert.equal((await request(moviePath + '?userId=bob', { method: 'PUT', headers: alice })).status, 204)
  assert.equal((await request(moviePath, { method: 'PUT', headers: alice })).status, 204)
  assert.deepEqual(await list(alice), ['324544'])
  assert.deepEqual(await list(bob), [])
  assert.equal((await request(moviePath, { method: 'DELETE', headers: bob })).status, 204)
  assert.deepEqual(await list(alice), ['324544'])
  assert.equal((await request(moviePath, { method: 'DELETE', headers: alice })).status, 204)
  assert.deepEqual(await list(alice), [])
})
