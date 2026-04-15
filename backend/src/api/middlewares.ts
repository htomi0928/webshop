import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customers/me/cart/restore",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      matcher: "/store/auth/google/customer-link",
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnregistered: true,
        }),
      ],
    },
    {
      matcher: "/admin/order-ops*",
      middlewares: [authenticate("user", ["bearer", "session", "api-key"])],
    },
  ],
})
