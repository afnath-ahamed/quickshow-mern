import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import MovieCard from './MovieCard'
import type { Movie } from './moviesApi'

export default function FeaturedMovies({ movies, recommended = false }: { movies: Movie[]; recommended?: boolean }) {
  if (!movies.length) return null

  const heading = recommended ? 'More movies' : 'Now showing'
  return (
    <section aria-label={heading} className="catalog-section">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="catalog-heading">{heading}</h2>
        <Link className="catalog-text-link" to="/movies">View all <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      <div className="movie-grid">
        {movies.slice(0, 4).map((movie) => <MovieCard key={movie.id} movie={movie} />)}
      </div>
    </section>
  )
}
