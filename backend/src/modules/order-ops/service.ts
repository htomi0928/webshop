import { MedusaService } from "@medusajs/framework/utils"
import OrderState from "./models/order-state"
import OrderStatusEvent from "./models/order-status-event"
import PaymentRecord from "./models/payment-record"

class OrderOpsModuleService extends MedusaService({
  OrderState,
  OrderStatusEvent,
  PaymentRecord,
}) {}

export default OrderOpsModuleService
