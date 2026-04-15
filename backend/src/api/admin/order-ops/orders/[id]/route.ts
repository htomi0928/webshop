import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import OrderOpsModuleService from "../../../../../modules/order-ops/service"
import { ORDER_OPS_MODULE } from "../../../../../modules/order-ops"

async function ensureOrderState(
  service: OrderOpsModuleService,
  orderId: string
) {
  const existing = await service.listOrderStates({
    order_id: orderId,
  })

  if (existing[0]) {
    return existing[0]
  }

  return await service.createOrderStates({
    order_id: orderId,
    workflow_status: "pending_review",
    payment_status: "not_started",
    fulfillment_status: "unfulfilled",
    last_status_note: "Order ops state initialized from admin API.",
    metadata: {
      initialized_by: "admin.order-ops",
    },
  })
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orderId = req.params.id
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
      "summary",
      "email",
      "customer.id",
      "customer.email",
    ],
    filters: {
      id: [orderId],
    },
  })

  const order = orders?.[0]

  if (!order) {
    return res.status(404).json({ message: "Order not found." })
  }

  const state = await ensureOrderState(orderOpsService, orderId)
  const timeline = await orderOpsService.listOrderStatusEvents(
    { order_id: orderId },
    {
      order: {
        created_at: "DESC",
      },
    }
  )
  const payments = await orderOpsService.listPaymentRecords(
    { order_id: orderId },
    {
      order: {
        created_at: "DESC",
      },
    }
  )

  return res.status(200).json({
    order,
    state,
    timeline,
    payments,
  })
}
