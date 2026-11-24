import Movie from '../models/Movie.js'
import Show from '../models/Show.js'

export const cinemaTimeZone = 'Asia/Colombo'
export const maxScreenings = 30

export function parseSchedule(input, now = new Date()) {
  const { movieId, priceMinor, startsAt } = input ?? {}
  if (typeof movieId !== 'string' || !/^[1-9][0-9]{0,9}$/.test(movieId)) {
    return { error: 'Select a valid TMDB movie.' }
  }
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 1 || priceMinor > 1_000_000_000) {
    return { error: 'Enter a valid positive ticket price.' }
  }
  if (!Array.isArray(startsAt) || startsAt.length < 1 || startsAt.length > maxScreenings) {
    return { error: 'Add between 1 and ' + maxScreenings + ' screening times.' }
  }
  const dates = []
  const unique = new Set()
  for (const value of startsAt) {
    // Colombo is UTC+05:30. Receive cinema-local date and time, independent of the admin's device.
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
      ? new Date(value + ':00+05:30')
      : new Date(NaN)
    if (!Number.isFinite(date.getTime()) ||
        new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 16) !== value ||
        date <= now) {
      return { error: 'Choose valid dates and times in the future.' }
    }

    if (unique.has(value)) return { error: 'Each screening time must be unique.' }
    unique.add(value)
    dates.push(date)
  }
  return { movieId, priceMinor, dates }
}

function duplicateOnly(error) {
  return error.writeErrors?.length
    ? error.writeErrors.every((item) => item.code === 11000)
    : error.code === 11000
}

export async function scheduleShows({ movieId, priceMinor, dates }, currency, fetchMovie) {
  let movie = await Movie.findOne({ tmdbId: movieId }).select('_id tmdbId title').lean()
  if (!movie) {
    const details = await fetchMovie(movieId)
    try {
      movie = await Movie.findOneAndUpdate(
        { tmdbId: movieId },
        { $setOnInsert: details },
        { upsert: true, returnDocument: 'after', runValidators: true },
      ).select('_id tmdbId title').lean()
    } catch (error) {
      if (error.code !== 11000) throw error
      movie = await Movie.findOne({ tmdbId: movieId }).select('_id tmdbId title').lean()
      if (!movie) throw error
    }
  }

  const createdAt = new Date()
  try {
    await Show.bulkWrite(dates.map((startsAt) => ({
      updateOne: {
        filter: { movie: movie._id, startsAt },
        update: { $setOnInsert: { movie: movie._id, startsAt, priceMinor, currency, createdAt, updatedAt: createdAt } },
        upsert: true,
        timestamps: false,
      },
    })), { ordered: false })
  } catch (error) {
    if (!duplicateOnly(error)) throw error
  }

  // Report the persisted price for each slot, including any slot an earlier request created.
  const saved = await Show.find({ movie: movie._id, startsAt: { $in: dates } }).sort({ startsAt: 1 }).lean()
  if (saved.length !== dates.length) throw new Error('Could not verify every screening in the batch.')
  return saved.map((show) => serializeShow(show, movie))
}

export function serializeShow(show, movie) {
  return {
    id: String(show._id),
    startsAt: show.startsAt,
    priceMinor: show.priceMinor,
    currency: show.currency,
    ...(movie && { movieId: movie.tmdbId, title: movie.title }),
  }
}

export async function listShows({ upcomingOnly = false, limit = 100, offset = 0 } = {}) {
  const filter = { movie: { $type: 'objectId' } }
  if (upcomingOnly) filter.startsAt = { $gt: new Date() }
  const [records, total] = await Promise.all([
    Show.find(filter).sort(upcomingOnly ? { startsAt: 1, _id: 1 } : { startsAt: -1, _id: -1 })
      .skip(offset).limit(limit).populate('movie', 'tmdbId title').lean(),
    Show.countDocuments(filter),
  ])
  return {
    shows: records.filter(({ movie }) => movie?.tmdbId).map((show) => serializeShow(show, show.movie)),
    total,
  }
}
