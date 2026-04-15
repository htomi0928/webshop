import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type CustomerRecord = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const authIdentityId = req.auth_context?.auth_identity_id
  const actorId = req.auth_context?.actor_id
  const currentMetadata = req.auth_context?.app_metadata || {}
  const userMetadata = req.auth_context?.user_metadata || {}

  if (!authIdentityId) {
    return res.status(401).json({ error: "Missing auth identity." })
  }

  const email = String(userMetadata.email || "").trim().toLowerCase()
  const firstName = String(userMetadata.given_name || "").trim()
  const lastName = String(userMetadata.family_name || "").trim()

  if (!email) {
    return res.status(400).json({ error: "Google account email is required." })
  }

  const query = req.scope.resolve("query")
  const authModuleService = req.scope.resolve(Modules.AUTH)

  if (actorId) {
    return res.status(200).json({
      action: "already-linked",
      customer_id: actorId,
      email,
    })
  }

  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "last_name"],
    filters: {
      email,
    },
  })

  const existingCustomer = ((data as CustomerRecord[]) || [])[0]

  if (existingCustomer) {
    await authModuleService.updateAuthIdentities({
      id: authIdentityId,
      app_metadata: {
        ...currentMetadata,
        customer_id: existingCustomer.id,
      },
    })

    return res.status(200).json({
      action: "linked-existing",
      customer_id: existingCustomer.id,
      email,
    })
  }

  return res.status(200).json({
    action: "create-required",
    customer_id: null,
    email,
    first_name: firstName || null,
    last_name: lastName || null,
  })
}
