import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OrderOpsModuleService from "../../../../modules/order-ops/service"
import { ORDER_OPS_MODULE } from "../../../../modules/order-ops"

type CallbackPayload = Record<string, unknown>

const PAYMENT_EVENT_BY_STATUS: Record<string, string> = {
  pending: "payment_pending",
  requires_action: "payment_pending",
  authorized: "payment_authorized",
  paid: "payment_paid",
  failed: "payment_failed",
  cancelled: "payment_failed",
  refunded: "payment_refunded",
}

function getHeader(req: MedusaRequest, headerName: string): string {
  const direct = (req.headers as Record<string, unknown>)[headerName]
  if (typeof direct === "string") {
    return direct
  }

  const normalized = headerName.toLowerCase()
  const lower = (req.headers as Record<string, unknown>)[normalized]
  if (typeof lower === "string") {
    return lower
  }

  return ""
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`
  }

  const objectValue = value as Record<string, unknown>
  const keys = Object.keys(objectValue).sort()
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalize(objectValue[key])}`)
    .join(",")}}`
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8")
  const rightBuffer = Buffer.from(right, "utf8")
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function verifySignature(req: MedusaRequest, payload: CallbackPayload): boolean {
  const requireSignature = process.env.SIMPLEPAY_REQUIRE_SIGNATURE !== "false"
  const secret = process.env.SIMPLEPAY_SECRET_KEY || ""

  if (!requireSignature) {
    return true
  }

  if (!secret) {
    return false
  }

  const signatureHeaderName =
    process.env.SIMPLEPAY_SIGNATURE_HEADER || "x-simplepay-signature"
  const algorithm = process.env.SIMPLEPAY_SIGNATURE_ALGORITHM || "sha256"
  const providedSignature = getHeader(req, signatureHeaderName)
    .trim()
    .toLowerCase()

  if (!providedSignature) {
    return false
  }

  const canonicalPayload = canonicalize(payload)
  const expectedHex = crypto
    .createHmac(algorithm, secret)
    .update(canonicalPayload)
    .digest("hex")
    .toLowerCase()

  const expectedBase64 = crypto
    .createHmac(algorithm, secret)
    .update(canonicalPayload)
    .digest("base64")
    .toLowerCase()

  return (
    safeEqual(providedSignature, expectedHex) ||
    safeEqual(providedSignature, expectedBase64)
  )
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizePaymentStatus(rawValue: string): string {
  const value = rawValue.toLowerCase()

  if (!value) return "pending"
  if (value.includes("refund")) return "refunded"
  if (value.includes("cancel")) return "cancelled"
  if (value.includes("fail") || value.includes("error")) return "failed"
  if (value.includes("authoriz") || value.includes("captur")) return "authorized"
  if (value.includes("paid") || value.includes("success") || value === "ok") return "paid"
  if (value.includes("action")) return "requires_action"

  return "pending"
}

function extractPaymentData(payload: CallbackPayload) {
  const orderId =
    asString(payload.order_id) ||
    asString(payload.orderId) ||
    asString(payload.order_ref) ||
    asString(payload.orderRef) ||
    asString(payload.merchant_order_id) ||
    asString(payload.merchantOrderId)

  const providerReference =
    asString(payload.transaction_id) ||
    asString(payload.transactionId) ||
    asString(payload.payment_id) ||
    asString(payload.paymentId) ||
    asString(payload.simplepay_transaction_id) ||
    asString(payload.simplepayTransactionId)

  const rawStatus =
    asString(payload.status) ||
    asString(payload.transaction_status) ||
    asString(payload.transactionStatus) ||
    asString(payload.payment_status) ||
    asString(payload.paymentStatus)

  const status = normalizePaymentStatus(rawStatus)

  const amount =
    asNumber(payload.amount) ??
    asNumber(payload.total) ??
    asNumber(payload.price) ??
    null

  const currencyCode =
    asString(payload.currency_code) ||
    asString(payload.currencyCode) ||
    asString(payload.currency) ||
    null

  const idempotencyKey =
    asString(payload.idempotency_key) ||
    asString(payload.idempotencyKey) ||
    [orderId || "order", providerReference || "noref", status].join(":")

  return {
    orderId,
    providerReference,
    status,
    amount,
    currencyCode,
    idempotencyKey,
  }
}

export async function POST(
  req: MedusaRequest<CallbackPayload>,
  res: MedusaResponse
) {
  const payload = (req.body || {}) as CallbackPayload

  if (!verifySignature(req, payload)) {
    return res.status(401).json({
      message: "Invalid callback signature.",
      accepted: false,
    })
  }

  const { orderId, providerReference, status, amount, currencyCode, idempotencyKey } =
    extractPaymentData(payload)

  if (!orderId) {
    return res.status(400).json({
      message: "Missing order identifier in callback payload.",
      accepted: false,
    })
  }

  const service: OrderOpsModuleService = req.scope.resolve(ORDER_OPS_MODULE)
  const [existingPayment] = await service.listPaymentRecords({
    order_id: orderId,
    idempotency_key: idempotencyKey,
  })

  if (existingPayment) {
    return res.status(200).json({
      accepted: true,
      idempotent: true,
      payment_record_id: existingPayment.id,
    })
  }

  const paymentRecord = await service.createPaymentRecords({
    order_id: orderId,
    provider: "simplepay",
    provider_reference: providerReference || null,
    idempotency_key: idempotencyKey,
    amount,
    currency_code: currencyCode,
    status: status as any,
    raw_payload: payload,
    metadata: {
      callback_source: "simplepay",
    },
  })

  const [existingState] = await service.listOrderStates({
    order_id: orderId,
  })

  const nextState = existingState
    ? await service.updateOrderStates({
        selector: { id: existingState.id },
        data: {
          payment_status: status as any,
          payment_provider: "simplepay",
          external_payment_reference: providerReference || null,
          metadata: existingState.metadata || null,
        },
      })
    : await service.createOrderStates({
        order_id: orderId,
        workflow_status: "pending_review",
        payment_status: status as any,
        fulfillment_status: "unfulfilled",
        payment_provider: "simplepay",
        external_payment_reference: providerReference || null,
        metadata: {
          initialized_by: "simplepay.callback",
        },
      })

  const statusEventName = PAYMENT_EVENT_BY_STATUS[status] || "payment_pending"

  await service.createOrderStatusEvents({
    order_id: orderId,
    status: statusEventName as any,
    source: "payment",
    note: "SimplePay callback received.",
    metadata: {
      provider: "simplepay",
      provider_reference: providerReference || null,
      idempotency_key: idempotencyKey,
      status,
    },
  })

  const stateId = Array.isArray(nextState) ? nextState[0]?.id : nextState?.id

  return res.status(200).json({
    accepted: true,
    idempotent: false,
    payment_record_id: paymentRecord.id,
    state_id: stateId || null,
  })
}
