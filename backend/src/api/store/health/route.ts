import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({
    ok: true,
    service: "medusa-backend",
  })
}
