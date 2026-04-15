import { sdk } from "@lib/config"
import { NextRequest, NextResponse } from "next/server"

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const countryCode =
    request.nextUrl.searchParams.get("countryCode") ||
    process.env.NEXT_PUBLIC_DEFAULT_REGION ||
    "hu"

  const callbackUrl = `${getBaseUrl(request)}/api/auth/google/callback?countryCode=${countryCode}`

  const result = await sdk.auth.login("customer", "google", {
    callback_url: callbackUrl,
  })

  if (typeof result === "string") {
    return NextResponse.redirect(new URL(`/${countryCode}/account`, getBaseUrl(request)))
  }

  return NextResponse.redirect(result.location)
}
