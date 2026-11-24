import { useAuth } from '@clerk/react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { getShows } from '../../features/admin/adminApi'
import ShowTable from '../../features/admin/ShowTable'
import useMovieQuery from '../../features/movies/useMovieQuery'
import ErrorState from '../../shared/ui/ErrorState'
import LoadingState from '../../shared/ui/LoadingState'

export default function Shows() {
  const { getToken } = useAuth()
  const [page, setPage] = useState(1)
  const load = useCallback((signal: AbortSignal) => getShows(getToken, page, signal), [getToken, page])
  const { result, retry } = useMovieQuery(load)
  const data = result.status === 'success' ? result.data : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="catalog-heading">List Shows</h1>
        <Link className="catalog-button catalog-button-primary" to="/admin/add-show">Add show</Link>
      </div>
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
      {data && (
        <>
          <ShowTable shows={data.shows} timeZone={data.timeZone} empty="No screenings on this page." />
          {(page > 1 || data.total > data.pageSize) && (
            <nav aria-label="Show pages" className="flex flex-wrap items-center gap-3">
              <button className="catalog-button catalog-button-secondary" disabled={page <= 1} type="button" onClick={() => setPage(page - 1)}>Previous</button>
              <span className="text-sm text-slate-300">Page {page}</span>
              <button className="catalog-button catalog-button-secondary" disabled={page * data.pageSize >= data.total} type="button" onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
