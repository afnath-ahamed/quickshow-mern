import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router'
import RequireAdmin from '../features/auth/RequireAdmin'
import RequireAuth from '../features/auth/RequireAuth'
import Favorites from '../pages/Favorites'
import Home from '../pages/Home'
import MovieDetails from '../pages/MovieDetails'
import Movies from '../pages/Movies'
import MyBookings from '../pages/MyBookings'
import SeatSelection from '../pages/SeatSelection'
import NotFound from '../pages/NotFound'
import SignIn from '../pages/SignIn'
import SignUp from '../pages/SignUp'
import AddShow from '../pages/admin/AddShow'
import Bookings from '../pages/admin/Bookings'
import Dashboard from '../pages/admin/Dashboard'
import Shows from '../pages/admin/Shows'
import AdminLayout from './layouts/AdminLayout'
import StorefrontLayout from './layouts/StorefrontLayout'

export default function AppRoutes() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Routes>
      <Route element={<StorefrontLayout><Outlet /></StorefrontLayout>}>
        <Route index element={<Home />} />
        <Route path="movies" element={<Movies />} />
        <Route path="movies/:movieId" element={<MovieDetails />} />
        <Route path="sign-in/*" element={<SignIn />} />
        <Route path="sign-up/*" element={<SignUp />} />
        <Route element={<RequireAuth />}>
          <Route path="favorites" element={<Favorites />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="shows/:showId/seats" element={<SeatSelection />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<RequireAuth />}>
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="add-show" element={<AddShow />} />
            <Route path="shows" element={<Shows />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
