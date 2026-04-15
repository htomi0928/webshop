import {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import OrderOpsModuleService from "../modules/order-ops/service"
import { ORDER_OPS_MODULE } from "../modules/order-ops"

type OrderPlacedEvent = {
  id: string
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const orderId = data?.id

  if (!orderId) {
    return
  }

  const orderOpsService: OrderOpsModuleService =
    container.resolve(ORDER_OPS_MODULE)

  const existing = await orderOpsService.listOrderStates({
    order_id: orderId,
  })

  if (!existing.length) {
    await orderOpsService.createOrderStates({
      order_id: orderId,
      workflow_status: "pending_review",
      payment_status: "pending",
      fulfillment_status: "unfulfilled",
      last_status_note: "Order placed and awaiting operational review.",
      metadata: {
        initialized_by: "order.placed",
      },
    })
  }

  await orderOpsService.createOrderStatusEvents({
    order_id: orderId,
    status: "placed",
    source: "system",
    note: "Order placed.",
    metadata: {
      event: "order.placed",
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
