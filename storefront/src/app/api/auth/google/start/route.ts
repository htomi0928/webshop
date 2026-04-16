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
  const callbackUrl =
    process.env.GOOGLE_CALLBACK_URL ||
    `${getBaseUrl(request)}/api/auth/google/callback`

  const result = await sdk.auth.login("customer", "google", {
    callback_url: callbackUrl,
  })

  if (typeof result === "string") {
    const fallbackCountryCode = process.env.NEXT_PUBLIC_DEFAULT_REGION || "hu"
    const response = NextResponse.redirect(
      new URL(`/${fallbackCountryCode}/account`, getBaseUrl(request))
    )
    response.cookies.set("oauth_country_code", countryCode, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    })

    return response
  }

  const response = NextResponse.redirect(result.location)
  response.cookies.set("oauth_country_code", countryCode, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  })

  return response
}
