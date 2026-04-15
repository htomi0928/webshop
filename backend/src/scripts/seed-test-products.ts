import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

type TestProduct = {
  title: string
  handle: string
  description: string
  image: string
  skuPrefix: string
  prices: { amount: number; currency_code: string }[]
}

function isDuplicateSkuError(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message || "")
      : ""
  return /already exists/i.test(message) && /sku/i.test(message)
}

const TEST_PRODUCTS: TestProduct[] = [
  {
    title: "Aurora Runner",
    handle: "aurora-runner",
    description:
      "Konnyu, modern utcai sneaker gradientes placeholder keppel, demo storefront teszteleshez.",
    image: "/products/shoe-aurora.svg",
    skuPrefix: "AURORA",
    prices: [{ amount: 24990, currency_code: "huf" }],
  },
  {
    title: "Mint Pace",
    handle: "mint-pace",
    description:
      "Friss, minimal sneaker sziluett mindennapi viseletre. Ideiglenes teszt termek a Medusa bolt feltolteshez.",
    image: "/products/shoe-mint.svg",
    skuPrefix: "MINT",
    prices: [{ amount: 21990, currency_code: "huf" }],
  },
  {
    title: "Noir Street",
    handle: "noir-street",
    description:
      "Sotetebb karakteru lifestyle sneaker, hogy a termeklista ne legyen ures a fejlesztes kozben.",
    image: "/products/shoe-noir.svg",
    skuPrefix: "NOIR",
    prices: [{ amount: 26990, currency_code: "huf" }],
  },
  {
    title: "Sunset Sprint",
    handle: "sunset-sprint",
    description:
      "Meleg szinu demo sneaker, latvanyos kartya teszteleshez es kosar flow kiprobalasahoz.",
    image: "/products/shoe-sunset.svg",
    skuPrefix: "SUNSET",
    prices: [{ amount: 23990, currency_code: "huf" }],
  },
]

export default async function seedTestProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const publicStoreOrigin = (
    process.env.PUBLIC_STORE_ORIGIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  const productHandles = TEST_PRODUCTS.map((product) => product.handle)
  const existingProductsResult = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: {
      handle: productHandles,
    },
  })

  const existingProducts = ((existingProductsResult as any)?.data || []) as any[]
  const existingProductsByHandle = new Map(
    existingProducts.map((product) => [product.handle, product])
  )
  const existingHandleSet = new Set(existingProducts.map((product) => product.handle))

  const [store] = await storeModuleService.listStores()
  if (!store) {
    throw new Error("No Medusa store found. Run bootstrap before seeding test products.")
  }

  const salesChannels = await salesChannelModuleService.listSalesChannels({
    id: [store.default_sales_channel_id].filter(Boolean),
  })
  const defaultSalesChannel = salesChannels[0]

  if (!defaultSalesChannel) {
    throw new Error("Default sales channel not found. Run bootstrap before seeding test products.")
  }

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  const shippingProfile = shippingProfiles[0]

  if (!shippingProfile) {
    throw new Error("Default shipping profile not found. Run bootstrap before seeding test products.")
  }

  const stockLocationsResult = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })

  const stockLocation = (stockLocationsResult as any)?.data?.[0]

  if (!stockLocation) {
    throw new Error("No stock location found. Run bootstrap before seeding test products.")
  }

  const categoriesResult = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: {
      name: ["Sneakers", "Lifestyle"],
    },
  })

  const categoryMap = new Map<string, string>()
  for (const category of ((categoriesResult as any)?.data || []) as any[]) {
    categoryMap.set(category.name, category.id)
  }

  const missingCategoryNames = ["Sneakers", "Lifestyle"].filter(
    (name) => !categoryMap.has(name)
  )

  if (missingCategoryNames.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategoryNames.map((name) => ({
          name,
          is_active: true,
        })),
      },
    })

    for (const category of result) {
      categoryMap.set(category.name, category.id)
    }
  }

  const productsToUpdate = TEST_PRODUCTS.filter((product) =>
    existingHandleSet.has(product.handle)
  ).map((product) => ({
    id: existingProductsByHandle.get(product.handle).id,
    title: product.title,
    description: product.description,
    thumbnail: `${publicStoreOrigin}${product.image}`,
    images: [
      {
        url: `${publicStoreOrigin}${product.image}`,
      },
    ],
    status: ProductStatus.PUBLISHED,
  }))

  if (productsToUpdate.length) {
    logger.info(`Refreshing ${productsToUpdate.length} existing test product image(s)...`)

    await updateProductsWorkflow(container).run({
      input: {
        products: productsToUpdate,
      },
    })
  }

  const productsToCreate = TEST_PRODUCTS.filter(
    (product) => !existingHandleSet.has(product.handle)
  ).map((product, index) => ({
    title: product.title,
    handle: product.handle,
    description: product.description,
    thumbnail: `${publicStoreOrigin}${product.image}`,
    status: ProductStatus.PUBLISHED,
    shipping_profile_id: shippingProfile.id,
    category_ids: [
      categoryMap.get("Sneakers")!,
      categoryMap.get(index % 2 === 0 ? "Lifestyle" : "Sneakers")!,
    ],
    images: [
      {
        url: `${publicStoreOrigin}${product.image}`,
      },
    ],
    options: [
      {
        title: "Size",
        values: ["40", "41", "42", "43"],
      },
      {
        title: "Color",
        values: ["Default"],
      },
    ],
    variants: ["40", "41", "42", "43"].map((size) => ({
      title: `${size} / Default`,
      sku: `${product.skuPrefix}-${size}`,
      options: {
        Size: size,
        Color: "Default",
      },
      prices: product.prices,
    })),
    sales_channels: [
      {
        id: defaultSalesChannel.id,
      },
    ],
  }))

  if (productsToCreate.length) {
    logger.info(`Creating ${productsToCreate.length} test product(s)...`)

    try {
      await createProductsWorkflow(container).run({
        input: {
          products: productsToCreate,
        },
      })
    } catch (error) {
      if (isDuplicateSkuError(error)) {
        logger.warn(
          "Skipping duplicate test product variant SKU during seed sync. Existing catalog data kept as-is."
        )
      } else {
        throw error
      }
    }
  }

  const inventoryItemsResult = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })

  const existingInventoryLevelsResult = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id", "location_id"],
    filters: {
      location_id: [stockLocation.id],
    },
  })

  const skuPrefixes = TEST_PRODUCTS.map((product) => product.skuPrefix)
  const existingInventoryLevelKeys = new Set(
    ((((existingInventoryLevelsResult as any)?.data || []) as any[]).map(
      (level) => `${level.inventory_item_id}:${level.location_id}`
    ))
  )

  const inventoryLevels: CreateInventoryLevelInput[] = (((inventoryItemsResult as any)?.data ||
    []) as any[])
    .filter((item) =>
      skuPrefixes.some(
        (prefix) => typeof item.sku === "string" && item.sku.startsWith(prefix)
      )
    )
    .filter(
      (item) => !existingInventoryLevelKeys.has(`${item.id}:${stockLocation.id}`)
    )
    .map((item) => ({
      location_id: stockLocation.id,
      stocked_quantity: 25,
      inventory_item_id: item.id,
    }))

  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryLevels,
      },
    })
  }

  logger.info("Finished syncing temporary shoe products.")
}
