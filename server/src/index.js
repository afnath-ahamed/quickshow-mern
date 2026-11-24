import app from './app.js'
import { connectDatabase } from './config/database.js'
import Favorite from './models/Favorite.js'
import Movie from './models/Movie.js'
import Show from './models/Show.js'

const { MONGODB_URI, PORT = '5000' } = process.env

if (!MONGODB_URI) {
  throw new Error('Set the MONGODB_URI environment variable before starting the API.')
}

try {
  await connectDatabase(MONGODB_URI)
  await Promise.all([Favorite.init(), Movie.init(), Show.init()])
} catch {
  console.error('Could not initialize MongoDB. Check MONGODB_URI and database availability.')
  process.exit(1)
}

app.listen(Number(PORT), () => {
  console.log('QuickShow API listening on port %s', PORT)
})
