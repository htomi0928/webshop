import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import OrderOpsModuleService from "../../../../../../modules/order-ops/service"
import { ORDER_OPS_MODULE } from "../../../../../../modules/order-ops"

const ALLOWED_PAYMENT_STATUSES = new Set([
  "pending",
  "requires_action",
  "authorized",
  "paid",
  "failed",
  "cancelled",
  "refunded",
])

const PAYMENT_EVENT_BY_STATUS: Record<string, string> = {
  pending: "payment_pending",
  requires_action: "payment_pending",
  authorized: "payment_authorized",
  paid: "payment_paid",
  failed: "payment_failed",
  cancelled: "payment_failed",
  refunded: "payment_refunded",
}

type PaymentBody = {
  provider?: string
  status?: string
  amount?: number | null
  currency_code?: string | null
  provider_reference?: string | null
  idempotency_key?: string | null
  error_code?: string | null
  error_message?: string | null
  note?: string | null
  raw_payload?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export async function POST(
  req: AuthenticatedMedusaRequest<PaymentBody>,
  res: MedusaResponse
) {
  const orderId = req.params.id
  const {
    provider,
    status,
    amount,
    currency_code,
    provider_reference,
    idempotency_key,
    error_code,
    error_message,
    note,
    raw_payload,
    metadata,
  } = req.body || {}

  if (!provider) {
    return res.status(400).json({ message: "Payment provider is required." })
  }

  if (!status || !ALLOWED_PAYMENT_STATUSES.has(status)) {
    return res.status(400).json({ message: "Invalid payment status." })
  }

  const service: OrderOpsModuleService = req.scope.resolve(ORDER_OPS_MODULE)

  const paymentRecord = await service.createPaymentRecords({
    order_id: orderId,
    provider,
    status: status as any,
    amount: typeof amount === "number" ? amount : null,
    currency_code: currency_code || null,
    provider_reference: provider_reference || null,
    idempotency_key: idempotency_key || null,
    error_code: error_code || null,
    error_message: error_message || null,
    raw_payload: raw_payload || null,
    metadata: metadata || null,
  })

  const [existingState] = await service.listOrderStates({
    order_id: orderId,
  })

  const nextState = existingState
    ? await service.updateOrderStates({
        selector: { id: existingState.id },
        data: {
          payment_status: status as any,
          payment_provider: provider,
          external_payment_reference: provider_reference || null,
          last_status_note: note || existingState.last_status_note || null,
          metadata: metadata || existingState.metadata || null,
        },
      })
    : await service.createOrderStates({
        order_id: orderId,
        workflow_status: "pending_review",
        payment_status: status as any,
        fulfillment_status: "unfulfilled",
        payment_provider: provider,
        external_payment_reference: provider_reference || null,
        last_status_note: note || null,
        metadata: metadata || null,
      })

  const statusEventName = PAYMENT_EVENT_BY_STATUS[status] || "payment_pending"

  const event = await service.createOrderStatusEvents({
    order_id: orderId,
    status: (statusEventName || "payment_pending") as any,
    source: "payment",
    actor_id: req.auth_context?.actor_id || null,
    note: note || null,
    metadata: {
      provider,
      provider_reference,
      status,
      ...(metadata || {}),
    },
  })

  return res.status(200).json({
    state: nextState,
    payment_record: paymentRecord,
    event,
  })
}
