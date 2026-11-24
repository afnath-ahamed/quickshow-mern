import { ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'
import type { Trailer } from './moviesApi'

export function TrailerPlayer({ trailer }: { trailer: Trailer }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#141421]">
        {playing ? (
          <iframe
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 size-full"
            referrerPolicy="strict-origin-when-cross-origin"
            src={'https://www.youtube-nocookie.com/embed/' + trailer.id + '?autoplay=1'}
            title={trailer.title + ' trailer'}
          />
        ) : (
          <button aria-label={'Play ' + trailer.title + ' trailer'} className="group absolute inset-0 grid w-full place-items-center" onClick={() => setPlaying(true)} type="button">
            <img alt="" className="absolute size-full object-cover opacity-70" src={trailer.thumbnailUrl} />
            <span className="relative grid size-16 place-items-center rounded-full bg-[#f84565] text-[#190910] transition group-hover:scale-110 sm:size-20">
              <Play size={28} fill="currentColor" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <a className="catalog-text-link mt-3" href={'https://www.youtube.com/watch?v=' + trailer.id} target="_blank" rel="noreferrer">
        Open on YouTube <ExternalLink size={15} aria-hidden="true" />
      </a>
    </div>
  )
}

export default function TrailerList({ trailers }: { trailers: Trailer[] }) {
  const [selected, setSelected] = useState<string>()
  const active = trailers.find((trailer) => trailer.id === selected) ?? trailers[0]
  if (!active) return null

  return (
    <section aria-labelledby="trailer-heading" className="catalog-section">
      <h2 id="trailer-heading" className="catalog-heading mb-6">Trailers</h2>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
        <TrailerPlayer key={active.id} trailer={active} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {trailers.map((trailer) => (
            <button key={trailer.id} aria-pressed={active.id === trailer.id} className="trailer-option" onClick={() => setSelected(trailer.id)} type="button">
              <img alt="" className="aspect-video w-full rounded-lg object-cover lg:w-28" loading="lazy" src={trailer.thumbnailUrl} />
              <span className="min-w-0 text-sm font-medium">{trailer.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
