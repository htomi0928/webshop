import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Webshop Medusa MVP",
  description:
    "Production-ready Medusa MVP storefront prepared for a custom webshop.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!region) {
    return (
      <div className="content-container py-16">
        <div className="rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-8">
          <h1 className="txt-compact-large-plus mb-3">Store setup incomplete</h1>
          <p className="txt-medium text-ui-fg-subtle">
            The storefront is running, but no region is configured yet. Run the Medusa
            bootstrap step, then reload this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Hero />
      <div className="py-12">
        {collections?.length ? (
          <ul className="flex flex-col gap-x-6">
            <FeaturedProducts collections={collections} region={region} />
          </ul>
        ) : (
          <div className="content-container">
            <div className="rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-8">
              <h2 className="txt-compact-large-plus mb-3">The store is live</h2>
              <p className="txt-medium text-ui-fg-subtle">
                Medusa, the admin panel, customer authentication, and the storefront are
                all wired up. You can start creating products from the admin when you are
                ready.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
