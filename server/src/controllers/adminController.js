import { cinemaTimeZone, maxScreenings } from '../services/showService.js'

export function getAdminAccess(_request, response) {
  return response.json({ role: 'admin' })
}

export function createAdminController({ tmdb, dashboard, currency }) {
  return {
    async getDashboard(_request, response) {
      return response.json(await dashboard())
    },
    async getNowPlaying(request, response) {
      const page = Number(request.query.page ?? 1)
      if (!Number.isInteger(page) || page < 1 || page > 500) {
        return response.status(400).json({ message: 'Choose a movie page between 1 and 500.' })
      }
      const result = await tmdb.fetchNowPlaying(page)
      return response.json({ ...result, currency, timeZone: cinemaTimeZone, maxScreenings })
    },
  }
}
