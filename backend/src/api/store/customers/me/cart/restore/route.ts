import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

type CartRecord = {
  id: string
  updated_at?: string | Date | null
  completed_at?: string | Date | null
  items?: { id: string }[]
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ cart_id: null, restored: false })
  }

  const query = req.scope.resolve("query")

  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "updated_at", "completed_at", "items.id"],
    filters: {
      customer_id: customerId,
    },
  })

  const carts = ((data as CartRecord[]) || []).filter((cart) => !cart.completed_at)

  const sorted = carts.sort((a, b) => {
    const aItems = a.items?.length || 0
    const bItems = b.items?.length || 0

    if (bItems !== aItems) {
      return bItems - aItems
    }

    return (
      new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    )
  })

  const activeCart = sorted[0] || null

  return res.status(200).json({
    cart_id: activeCart?.id || null,
    restored: Boolean(activeCart),
  })
}
