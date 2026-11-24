import { Router } from 'express'
import { getMovie, getMovies } from '../controllers/moviesController.js'

const router = Router()

router.get('/', getMovies)
router.get('/:movieId', getMovie)

export default router
