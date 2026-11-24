import { Show, UserButton } from '@clerk/react'
import { Link } from 'react-router'

export default function AccountMenu() {
  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-4">
          <Link to="/sign-in">Sign in</Link>
          <Link to="/sign-up" className="rounded-md bg-slate-900 px-3 py-2 text-white">Sign up</Link>
        </div>
      </Show>
      <Show when="signed-in">
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link href="/my-bookings" label="My Bookings" labelIcon={<span aria-hidden="true">▤</span>} />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </>
  )
}
