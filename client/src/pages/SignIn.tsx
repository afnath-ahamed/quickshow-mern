import { SignIn as ClerkSignIn } from '@clerk/react'

export default function SignIn() {
  return (
    <main className="flex justify-center px-6 py-12">
      <ClerkSignIn routing="path" path="/sign-in" />
    </main>
  )
}
