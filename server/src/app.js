import express from 'express'
import healthRouter from './routes/health.js'

const app = express()

app.use('/api', healthRouter)

export default app
