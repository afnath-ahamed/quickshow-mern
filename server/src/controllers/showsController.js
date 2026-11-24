import { cinemaTimeZone, parseSchedule } from '../services/showService.js'

const pageSize = 20

export default function createShowsController({ listShows, scheduleShows }) {
  return {
    async list(request, response) {
      const page = Number(request.query.page ?? 1)
      if (!Number.isInteger(page) || page < 1 || page > 10_000) {
        return response.status(400).json({ message: 'Choose a valid shows page.' })
      }
      const { shows, total } = await listShows({ limit: pageSize, offset: (page - 1) * pageSize })
      return response.json({ shows, total, page, pageSize, timeZone: cinemaTimeZone })
    },
    async create(request, response) {
      const input = parseSchedule(request.body)
      if (input.error) return response.status(400).json({ message: input.error })
      const shows = await scheduleShows(input)
      return response.json({ shows })
    },
  }
}
