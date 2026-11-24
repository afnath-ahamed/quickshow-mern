import app from './app.js'
import { connectDatabase } from './config/database.js'

const { MONGODB_URI, PORT = '5000' } = process.env

if (!MONGODB_URI) {
  throw new Error('Set the MONGODB_URI environment variable before starting the API.')
}

try {
  await connectDatabase(MONGODB_URI)
} catch {
  console.error('Could not connect to MongoDB. Check MONGODB_URI and database availability.')
  process.exit(1)
}

app.listen(Number(PORT), () => {
  console.log('QuickShow API listening on port %s', PORT)
})
