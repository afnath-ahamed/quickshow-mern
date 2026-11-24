import { cinemaTimeZone, listShows, maxScreenings } from './showService.js'

export async function getDashboard(countUsers, currency) {
  const [upcoming, users] = await Promise.all([
    listShows({ upcomingOnly: true, limit: 8 }),
    Promise.resolve().then(countUsers).catch(() => null),
  ])
  return { upcoming: upcoming.shows, activeShows: upcoming.total, users, timeZone: cinemaTimeZone, currency, maxScreenings }
}
