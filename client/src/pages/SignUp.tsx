import { SignUp as ClerkSignUp } from '@clerk/react'

export default function SignUp() {
  return (
    <main className="flex justify-center px-6 py-12">
      <ClerkSignUp routing="path" path="/sign-up" />
    </main>
  )
}
