import { model } from "@medusajs/framework/utils"

const OrderState = model.define("order_state", {
  id: model.id().primaryKey(),
  order_id: model.text().unique(),
  workflow_status: model
    .enum([
      "pending_review",
      "confirmed",
      "processing",
      "ready_to_ship",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .default("pending_review"),
  payment_status: model
    .enum([
      "not_started",
      "pending",
      "requires_action",
      "authorized",
      "paid",
      "failed",
      "cancelled",
      "refunded",
    ])
    .default("not_started"),
  fulfillment_status: model
    .enum([
      "unfulfilled",
      "partially_fulfilled",
      "fulfilled",
      "shipped",
      "delivered",
      "returned",
      "cancelled",
    ])
    .default("unfulfilled"),
  payment_provider: model.text().nullable(),
  external_payment_reference: model.text().nullable(),
  last_status_note: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default OrderState
