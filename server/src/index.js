import app from './app.js'
import { connectDatabase } from './config/database.js'
import Favorite from './models/Favorite.js'
import Booking from './models/Booking.js'
import SeatClaim from './models/SeatClaim.js'
import Payment from './models/Payment.js'
import Movie from './models/Movie.js'
import Show from './models/Show.js'
import NotificationJob from './models/NotificationJob.js'
import User from './models/User.js'

const { MONGODB_URI, PORT = '5000' } = process.env

if (!MONGODB_URI) {
  throw new Error('Set the MONGODB_URI environment variable before starting the API.')
}

try {
  await connectDatabase(MONGODB_URI)
  await Promise.all([Favorite, Movie, Show, Booking, SeatClaim, Payment, NotificationJob, User].map((model) => model.init()))
} catch {
  console.error('Could not initialize MongoDB. Check MONGODB_URI and database availability.')
  process.exit(1)
}

app.listen(Number(PORT), () => {
  console.log('QuickShow API listening on port %s', PORT)
})
