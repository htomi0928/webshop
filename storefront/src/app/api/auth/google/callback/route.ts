import { sdk } from "@lib/config"
import {
  getCartId,
  removeCartId,
  setAuthToken,
  setCartId,
} from "@lib/data/cookies"
import { NextRequest, NextResponse } from "next/server"

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
}

async function linkOrCreateCustomer(token: string) {
  const headers = { authorization: `Bearer ${token}` }

  const result = await sdk.client.fetch<{
    action: "already-linked" | "linked-existing" | "create-required"
    customer_id: string | null
    email: string
    first_name?: string | null
    last_name?: string | null
  }>("/store/auth/google/customer-link", {
    method: "POST",
    headers,
    cache: "no-store",
  })

  if (result.action === "create-required") {
    await sdk.store.customer.create(
      {
        email: result.email,
        first_name: result.first_name || undefined,
        last_name: result.last_name || undefined,
      },
      {},
      headers
    )
  }

  return result
}

async function syncCart(token: string) {
  const headers = { authorization: `Bearer ${token}` }
  const cartId = await getCartId()

  if (cartId) {
    try {
      await sdk.store.cart.transferCart(cartId, {}, headers)
    } catch {}
  }

  const restored = await sdk.client.fetch<{
    cart_id: string | null
    restored: boolean
  }>("/store/customers/me/cart/restore", {
    method: "POST",
    headers,
    cache: "no-store",
  })

  if (restored?.cart_id) {
    await setCartId(restored.cart_id)
  } else {
    await removeCartId()
  }
}

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries())
  const countryCookie = request.cookies.get("oauth_country_code")?.value
  const countryCode =
    request.nextUrl.searchParams.get("countryCode") ||
    countryCookie ||
    process.env.NEXT_PUBLIC_DEFAULT_REGION ||
    "hu"

  try {
    const token = await sdk.auth.callback("customer", "google", query)
    let sessionToken = token

    await linkOrCreateCustomer(token)

    try {
      const refreshedToken = await sdk.auth.refresh({
        authorization: `Bearer ${token}`,
      })
      if (refreshedToken) {
        sessionToken = refreshedToken
      }
    } catch (refreshError) {
      console.warn("[google-oauth] refresh failed, using callback token", refreshError)
    }

    await setAuthToken(sessionToken)

    try {
      await syncCart(sessionToken)
    } catch (cartError) {
      console.warn("[google-oauth] cart sync failed", cartError)
    }

    const response = NextResponse.redirect(
      new URL(`/${countryCode}/account`, getBaseUrl(request))
    )
    response.cookies.delete("oauth_country_code")
    return response
  } catch (error) {
    console.error("[google-oauth] callback failed", error)
    const reason =
      error instanceof Error
        ? error.message.slice(0, 160)
        : "unknown_error"
    const encodedReason = encodeURIComponent(reason)
    const response = NextResponse.redirect(
      new URL(
        `/${countryCode}/account?google_auth_error=callback_failed&google_auth_reason=${encodedReason}`,
        getBaseUrl(request)
      )
    )
    response.cookies.delete("oauth_country_code")
    return response
  }
}
