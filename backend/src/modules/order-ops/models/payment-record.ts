import { model } from "@medusajs/framework/utils"

const PaymentRecord = model.define("payment_record", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  provider: model.text(),
  provider_reference: model.text().nullable(),
  idempotency_key: model.text().nullable(),
  amount: model.number().nullable(),
  currency_code: model.text().nullable(),
  status: model
    .enum([
      "pending",
      "requires_action",
      "authorized",
      "paid",
      "failed",
      "cancelled",
      "refunded",
    ])
    .default("pending"),
  error_code: model.text().nullable(),
  error_message: model.text().nullable(),
  raw_payload: model.json().nullable(),
  metadata: model.json().nullable(),
})

export default PaymentRecord
