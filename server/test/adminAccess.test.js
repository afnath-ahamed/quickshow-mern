import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../src/app.js'

const frontendOrigin = 'http://localhost:5173'

async function startApi(t) {
  const sessions = new Map([
    ['member-session', 'user_member'],
    ['admin-session', 'user_admin'],
    ['unavailable-session', 'user_unavailable'],
  ])
  const app = createApp({
    frontendOrigin,
    authenticate: (request, _response, next) => {
      const token = request.get('Authorization')?.slice('Bearer '.length)
      request.testUserId = sessions.get(token)
      next()
    },
    readAuth: (request) => ({
      isAuthenticated: Boolean(request.testUserId),
      userId: request.testUserId,
    }),
    getUser: async (userId) => {
      if (userId === 'user_unavailable') throw new Error('Clerk is unavailable')
      return {
        privateMetadata: userId === 'user_admin' ? { role: 'admin' } : {},
        unsafeMetadata: { role: 'admin' },
      }
    },
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  }))

  const baseUrl = 'http://127.0.0.1:' + server.address().port
  return (path, options) => fetch(baseUrl + path, options)
}

test('account and admin endpoints require a valid session', async (t) => {
  const request = await startApi(t)
  for (const endpoint of ['/api/users/me', '/api/admin/access']) {
    assert.equal((await request(endpoint)).status, 401)
    const response = await request(endpoint, { headers: { Authorization: 'Bearer unknown-session' } })
    assert.equal(response.status, 401)
  }
})

test('the account endpoint returns the caller and their server-side role', async (t) => {
  const request = await startApi(t)
  const response = await request('/api/users/me?userId=user_admin', {
    headers: { Authorization: 'Bearer member-session' },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { userId: 'user_member', role: 'user' })
})

test('admin access requires the Clerk private metadata role', async (t) => {
  const request = await startApi(t)
  const member = await request('/api/admin/access', {
    headers: { Authorization: 'Bearer member-session', 'X-Role': 'admin' },
  })
  const admin = await request('/api/admin/access', { headers: { Authorization: 'Bearer admin-session' } })

  assert.equal(member.status, 403)
  assert.equal(admin.status, 200)
  assert.equal(admin.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await admin.json(), { role: 'admin' })
})

test('admin access is unavailable when Clerk cannot verify the role', async (t) => {
  const request = await startApi(t)
  const response = await request('/api/admin/access', {
    headers: { Authorization: 'Bearer unavailable-session' },
  })
  assert.equal(response.status, 503)
})

test('health stays public and API requests support the configured frontend origin', async (t) => {
  const request = await startApi(t)
  const health = await request('/api/health')
  assert.equal(health.status, 503)
  assert.equal((await health.json()).database, 'disconnected')

  const preflight = await request('/api/users/me', {
    method: 'OPTIONS',
    headers: {
      Origin: frontendOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization',
    },
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), frontendOrigin)
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/i)
})
