import { cinemaTimeZone, listShows, maxScreenings } from './showService.js'
import { getBookingCounts } from './bookingService.js'
import { getRevenue } from './paymentService.js'

export async function listShowsWithBookingCounts(options) {
  const { shows, total } = await listShows(options)
  const showIds = shows.map(({ id }) => id)
  const [counts, revenue] = await Promise.all([getBookingCounts(showIds), getRevenue(showIds)])
  return {
    shows: shows.map((show) => ({
      ...show, bookingCounts: counts.get(show.id) ?? { holds: 0, confirmed: 0 }, revenue: revenue.get(show.id) ?? [],
    })),
    total,
  }
}

export async function getDashboard(countUsers, currency) {
  const [upcoming, users, bookingCounts, revenue] = await Promise.all([
    listShowsWithBookingCounts({ upcomingOnly: true, limit: 8 }),
    Promise.resolve().then(countUsers).catch(() => null),
    getBookingCounts(),
    getRevenue(),
  ])
  return { upcoming: upcoming.shows, activeShows: upcoming.total, users, bookingCounts, revenue, timeZone: cinemaTimeZone, currency, maxScreenings }
}
