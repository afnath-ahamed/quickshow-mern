import { Show, UserButton } from '@clerk/react'
import { Link } from 'react-router'

export default function AccountMenu() {
  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <Link to="/sign-in" className="whitespace-nowrap hover:text-[#ff7790]">Sign in</Link>
          <Link to="/sign-up" className="catalog-button catalog-button-primary whitespace-nowrap">Sign up</Link>
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
