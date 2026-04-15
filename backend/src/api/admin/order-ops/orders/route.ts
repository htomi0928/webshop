import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import OrderOpsModuleService from "../../../../modules/order-ops/service"
import { ORDER_OPS_MODULE } from "../../../../modules/order-ops"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const query = req.scope.resolve("query")
  const orderOpsService: OrderOpsModuleService =
    req.scope.resolve(ORDER_OPS_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "created_at",
      "updated_at",
      "currency_code",
      "total",
      "email",
      "customer.id",
      "customer.email",
    ],
    pagination: {
      skip: offset,
      take: limit,
      order: {
        created_at: "DESC",
      },
    },
  })

  const orderIds = (orders || []).map((order: any) => order.id)
  const states = orderIds.length
    ? await orderOpsService.listOrderStates({
        order_id: orderIds,
      })
    : []

  const stateMap = new Map(states.map((state) => [state.order_id, state]))

  return res.status(200).json({
    count: orders?.length || 0,
    orders: (orders || []).map((order: any) => ({
      ...order,
      ops_state: stateMap.get(order.id) || null,
    })),
  })
}
