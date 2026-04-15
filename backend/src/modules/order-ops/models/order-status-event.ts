import { model } from "@medusajs/framework/utils"

const OrderStatusEvent = model.define("order_status_event", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  status: model.enum([
    "placed",
    "pending_review",
    "confirmed",
    "processing",
    "ready_to_ship",
    "shipped",
    "delivered",
    "cancelled",
    "payment_pending",
    "payment_authorized",
    "payment_paid",
    "payment_failed",
    "payment_refunded",
  ]),
  source: model.enum(["system", "admin", "payment"]).default("system"),
  actor_id: model.text().nullable(),
  note: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default OrderStatusEvent
