import { Outlet, Route, Routes } from 'react-router'
import RequireAdmin from '../features/auth/RequireAdmin'
import RequireAuth from '../features/auth/RequireAuth'
import Home from '../pages/Home'
import MyBookings from '../pages/MyBookings'
import NotFound from '../pages/NotFound'
import SignIn from '../pages/SignIn'
import SignUp from '../pages/SignUp'
import Dashboard from '../pages/admin/Dashboard'
import AdminLayout from './layouts/AdminLayout'
import StorefrontLayout from './layouts/StorefrontLayout'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<StorefrontLayout><Outlet /></StorefrontLayout>}>
        <Route index element={<Home />} />
        <Route path="sign-in/*" element={<SignIn />} />
        <Route path="sign-up/*" element={<SignUp />} />
        <Route element={<RequireAuth />}>
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
