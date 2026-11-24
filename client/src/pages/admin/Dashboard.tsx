import { useAuth } from '@clerk/react'
import { CalendarPlus } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'
import { getDashboard } from '../../features/admin/adminApi'
import DashboardStats from '../../features/admin/DashboardStats'
import ShowTable from '../../features/admin/ShowTable'
import useMovieQuery from '../../features/movies/useMovieQuery'
import ErrorState from '../../shared/ui/ErrorState'
import LoadingState from '../../shared/ui/LoadingState'

export default function Dashboard() {
  const { getToken } = useAuth()
  const load = useCallback((signal: AbortSignal) => getDashboard(getToken, signal), [getToken])
  const { result, retry } = useMovieQuery(load)

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="catalog-heading">Admin Dashboard</h1>
        <Link to="/admin/add-show" className="catalog-button catalog-button-primary"><CalendarPlus size={17} aria-hidden="true" /> Add show</Link>
      </div>
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
      {result.status === 'success' && (
        <>
          <DashboardStats data={result.data} />
          <section aria-labelledby="upcoming-shows">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="upcoming-shows" className="text-xl font-semibold">Upcoming shows</h2>
              <Link className="catalog-text-link" to="/admin/shows">View all shows</Link>
            </div>
            <ShowTable shows={result.data.upcoming} timeZone={result.data.timeZone} empty="No upcoming shows. Add a screening to get started." />
          </section>
        </>
      )}
    </div>
  )
}
