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
  const countryCode =
    request.nextUrl.searchParams.get("countryCode") ||
    process.env.NEXT_PUBLIC_DEFAULT_REGION ||
    "hu"

  try {
    const token = await sdk.auth.callback("customer", "google", query)
    await setAuthToken(token)

    await linkOrCreateCustomer(token)

    const refreshedToken = await sdk.auth.refresh({
      authorization: `Bearer ${token}`,
    })

    await setAuthToken(refreshedToken)
    await syncCart(refreshedToken)

    return NextResponse.redirect(new URL(`/${countryCode}/account`, getBaseUrl(request)))
  } catch {
    return NextResponse.redirect(
      new URL(`/${countryCode}/account?google_auth_error=1`, getBaseUrl(request))
    )
  }
}
