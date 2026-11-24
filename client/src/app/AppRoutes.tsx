import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router'
import RequireAdmin from '../features/auth/RequireAdmin'
import RequireAuth from '../features/auth/RequireAuth'
import Favorites from '../pages/Favorites'
import Home from '../pages/Home'
import MovieDetails from '../pages/MovieDetails'
import Movies from '../pages/Movies'
import MyBookings from '../pages/MyBookings'
import NotFound from '../pages/NotFound'
import SignIn from '../pages/SignIn'
import SignUp from '../pages/SignUp'
import Dashboard from '../pages/admin/Dashboard'
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
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
