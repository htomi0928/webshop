import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import OrderOpsModuleService from "../../../../../../modules/order-ops/service"
import { ORDER_OPS_MODULE } from "../../../../../../modules/order-ops"

const ALLOWED_WORKFLOW_STATUSES = new Set([
  "pending_review",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
])

type StatusBody = {
  status?: string
  note?: string
  metadata?: Record<string, unknown> | null
}

export async function POST(
  req: AuthenticatedMedusaRequest<StatusBody>,
  res: MedusaResponse
) {
  const orderId = req.params.id
  const { status, note, metadata } = req.body || {}

  if (!status || !ALLOWED_WORKFLOW_STATUSES.has(status)) {
    return res.status(400).json({
      message: "Invalid workflow status.",
    })
  }

  const service: OrderOpsModuleService = req.scope.resolve(ORDER_OPS_MODULE)

  const [existing] = await service.listOrderStates({
    order_id: orderId,
  })

  const state = existing
    ? await service.updateOrderStates({
        selector: { id: existing.id },
        data: {
          workflow_status: status as any,
          last_status_note: note || null,
          metadata: metadata || existing.metadata || null,
        },
      })
    : await service.createOrderStates({
        order_id: orderId,
        workflow_status: status as any,
        payment_status: "not_started",
        fulfillment_status: "unfulfilled",
        last_status_note: note || null,
        metadata: metadata || null,
      })

  const event = await service.createOrderStatusEvents({
    order_id: orderId,
    status: status as any,
    source: "admin",
    actor_id: req.auth_context?.actor_id || null,
    note: note || null,
    metadata: metadata || null,
  })

  return res.status(200).json({
    state,
    event,
  })
}
