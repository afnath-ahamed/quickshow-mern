import express from 'express'
import mongoose from 'mongoose'

const { MONGODB_URI, PORT = '5000' } = process.env

if (!MONGODB_URI) {
  throw new Error('Set the MONGODB_URI environment variable before starting the API.')
}

const app = express()

app.get('/api/health', (_request, response) => {
  const connected = mongoose.connection.readyState === 1

  response.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
  })
})

try {
  await mongoose.connect(MONGODB_URI)
} catch {
  console.error('Could not connect to MongoDB. Check MONGODB_URI and database availability.')
  process.exit(1)
}

app.listen(Number(PORT), () => {
  console.log('QuickShow API listening on port %s', PORT)
})
