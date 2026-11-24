import { UserRound } from 'lucide-react'
import { useState } from 'react'
import type { MovieDetails } from './moviesApi'

function CastPortrait({ imageUrl }: { imageUrl?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="mx-auto grid size-16 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-slate-400 sm:size-20">
      {imageUrl && !failed
        ? <img alt="" className="size-full object-cover" loading="lazy" onError={() => setFailed(true)} src={imageUrl} />
        : <UserRound size={25} aria-hidden="true" />}
    </span>
  )
}

export default function MovieCast({ cast }: { cast: MovieDetails['cast'] }) {
  if (!cast.length) return null
  return (
    <section aria-labelledby="cast-heading" className="catalog-section">
      <h2 id="cast-heading" className="catalog-heading mb-6">Cast</h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-6">
        {cast.map(({ name, imageUrl }) => (
          <li key={name} className="w-20 text-center text-sm text-slate-200 sm:w-24">
            <CastPortrait imageUrl={imageUrl} />
            <p className="mt-2">{name}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
