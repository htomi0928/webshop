"use client"

import { useParams } from "next/navigation"

const GoogleSigninLink = ({ label }: { label: string }) => {
  const params = useParams<{ countryCode: string }>()
  const countryCode = params?.countryCode || "hu"

  return (
    <a
      href={`/api/auth/google/start?countryCode=${countryCode}`}
      className="w-full mt-3 inline-flex items-center justify-center rounded-md border border-ui-border-base px-4 py-3 text-sm font-medium text-ui-fg-base transition-colors hover:bg-ui-bg-subtle"
      data-testid="google-auth-link"
    >
      {label}
    </a>
  )
}

export default GoogleSigninLink
