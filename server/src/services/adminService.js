import { cinemaTimeZone, listShows, maxScreenings } from './showService.js'
import { getBookingCounts } from './bookingService.js'

export async function listShowsWithBookingCounts(options) {
  const { shows, total } = await listShows(options)
  const counts = await getBookingCounts(shows.map(({ id }) => id))
  return {
    shows: shows.map((show) => ({ ...show, bookingCounts: counts.get(show.id) ?? { holds: 0, confirmed: 0 } })),
    total,
  }
}

export async function getDashboard(countUsers, currency) {
  const [upcoming, users, bookingCounts] = await Promise.all([
    listShowsWithBookingCounts({ upcomingOnly: true, limit: 8 }),
    Promise.resolve().then(countUsers).catch(() => null),
    getBookingCounts(),
  ])
  return { upcoming: upcoming.shows, activeShows: upcoming.total, users, bookingCounts, timeZone: cinemaTimeZone, currency, maxScreenings }
}
