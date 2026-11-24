import { ArrowUpRight, Film, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { formatRuntime, type Movie } from './moviesApi'

export function MovieArtwork({ src, className = '' }: { src: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>()
  return (
    <div className={'relative overflow-hidden bg-[#1b1b2a] ' + className}>
      {!src || failedSrc === src ? (
        <span className="absolute inset-0 grid place-items-center text-slate-500"><Film size={40} aria-hidden="true" /></span>
      ) : (
        <img alt="" className="absolute size-full object-cover" loading="lazy" onError={() => setFailedSrc(src)} src={src} />
      )}
    </div>
  )
}

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="movie-card">
      <Link className="group block rounded-xl" to={'/movies/' + movie.id} aria-label={movie.title}>
        <div className="relative overflow-hidden rounded-xl">
          <MovieArtwork src={movie.posterUrl} className="aspect-[2/3] transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1.5 text-xs font-semibold text-white">
            <Star fill="currentColor" size={13} className="text-amber-300" aria-hidden="true" />
            <span aria-label={movie.rating.toFixed(1) + ' out of 10'}>{movie.rating.toFixed(1)}</span>
          </span>
        </div>
        <div className="flex min-w-0 items-start gap-2 px-1 pt-3 pb-1">
          <div className="min-w-0 flex-1">
            <h3 className="leading-tight font-semibold text-white">{movie.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {[movie.releaseDate.slice(0, 4), movie.genres[0], movie.runtime ? formatRuntime(movie.runtime) : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ArrowUpRight size={17} className="mt-0.5 shrink-0 text-[#ff7790]" aria-hidden="true" />
        </div>
      </Link>
    </article>
  )
}
