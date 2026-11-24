import MovieCard from '../features/movies/MovieCard'
import { getMovies } from '../features/movies/moviesApi'
import useMovieQuery from '../features/movies/useMovieQuery'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

export default function Movies() {
  const { result, retry } = useMovieQuery(getMovies)

  return (
    <main className="catalog-container catalog-page">
      <h1 className="catalog-page-title mb-8">Now showing</h1>
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
      {result.status === 'success' && (result.data.movies.length ? (
        <div className="movie-grid">
          {result.data.movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      ) : <p>No movies are currently showing.</p>)}
    </main>
  )
}
