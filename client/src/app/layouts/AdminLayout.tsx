import { UserButton } from '@clerk/react'
import { CalendarDays, CalendarPlus, LayoutDashboard } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import logo from '../../shared/assets/logo.svg'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/add-show', label: 'Add Show', icon: CalendarPlus },
  { to: '/admin/shows', label: 'List Shows', icon: CalendarDays },
]

export default function AdminLayout() {
  return (
    <div className="storefront">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#12121c] px-4 sm:px-7">
        <Link className="w-30" to="/"><img src={logo} alt="QuickShow home" /></Link>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-slate-300 hover:text-white" to="/">Storefront</Link>
          <UserButton />
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[100rem] flex-1 md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#12121c] md:border-r md:border-b-0">
          <nav aria-label="Admin navigation" className="flex flex-wrap gap-1 p-3 md:flex-col md:py-7">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                className={({ isActive }) => 'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ' +
                  (isActive ? 'bg-[#3d2030] text-[#ffa2b4]' : 'text-slate-300 hover:bg-white/5 hover:text-white')}
                end
                key={to}
                to={to}
              >
                <Icon size={17} aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10"><Outlet /></main>
      </div>
    </div>
  )
}
