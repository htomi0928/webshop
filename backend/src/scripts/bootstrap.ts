import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

const updateStoreCurrencies = createWorkflow(
  "bootstrap-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[]
    store_id: string
  }) => {
    const normalizedInput = transform({ input }, (data) => ({
      selector: { id: data.input.store_id },
      update: {
        supported_currencies: data.input.supported_currencies.map((currency) => ({
          currency_code: currency.currency_code,
          is_default: currency.is_default ?? false,
        })),
      },
    }))

    const stores = updateStoresStep(normalizedInput)

    return new WorkflowResponse(stores)
  }
)

export default async function bootstrap({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)
  const apiKeyModuleService = container.resolve(Modules.API_KEY) as any

  const defaultCountry = (process.env.BOOTSTRAP_DEFAULT_REGION || "hu").toLowerCase()
  const defaultCurrency = (process.env.BOOTSTRAP_DEFAULT_CURRENCY || "huf").toLowerCase()
  const publishableKeyToken = process.env.PUBLISHABLE_API_KEY || "pk_webshop_medusa_local"
  const enableManualPayment = process.env.ENABLE_MANUAL_PAYMENT !== "false"

  logger.info("Bootstrapping minimal Medusa store setup...")

  const [store] = await storeModuleService.listStores()

  let [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!defaultSalesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    })

    defaultSalesChannel = result[0]
    logger.info("Created default sales channel.")
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [{ currency_code: defaultCurrency, is_default: true }],
    },
  })

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel.id,
      },
    },
  })

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.*"],
    filters: { name: "Primary Region" },
  })

  let region: any = existingRegions?.[0]

  if (!region) {
    const regionInput: any = {
      name: "Primary Region",
      currency_code: defaultCurrency,
      countries: [defaultCountry],
    }

    if (enableManualPayment) {
      regionInput.payment_providers = ["pp_system_default"]
    }

    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [regionInput],
      },
    })

    region = result[0]
    logger.info(`Created region for ${defaultCountry.toUpperCase()}.`)
  }

  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: { country_code: defaultCountry },
  })

  if (!existingTaxRegions?.length) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: defaultCountry, provider_id: "tp_system" }],
    })
    logger.info("Created tax region.")
  }

  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: { name: "Primary Warehouse" },
  })

  let stockLocation: any = existingLocations?.[0]

  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Primary Warehouse",
            address: {
              city: "Budapest",
              country_code: defaultCountry.toUpperCase(),
              address_1: "Demo warehouse",
            },
          },
        ],
      },
    })

    stockLocation = result[0]
    logger.info("Created stock location.")
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  })

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })

  let shippingProfile = shippingProfiles[0]

  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    })

    shippingProfile = result[0]
    logger.info("Created default shipping profile.")
  }

  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
    name: "Primary Warehouse delivery",
  })

  let fulfillmentSet = existingFulfillmentSets[0]

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Primary Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Primary Zone",
          geo_zones: [
            {
              country_code: defaultCountry,
              type: "country",
            },
          ],
        },
      ],
    })
    logger.info("Created fulfillment set.")
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
  } catch {}

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })
  } catch {}

  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
    filters: { name: "Standard Shipping" },
  })

  if (!existingShippingOptions?.length) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Default shipping option for the MVP storefront.",
            code: "standard",
          },
          prices: [
            {
              region_id: region.id,
              amount: 0,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    })
    logger.info("Created default shipping option.")
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  })

  const { data: publishableKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type"],
    filters: {
      type: "publishable",
      token: publishableKeyToken,
    },
  })

  let publishableKey: any = publishableKeys?.[0]

  if (!publishableKey) {
    const createdApiKey = await apiKeyModuleService.apiKeyService_.create({
      title: "Storefront Publishable Key",
      type: "publishable",
      created_by: "bootstrap",
      token: publishableKeyToken,
      salt: "",
      redacted: [publishableKeyToken.slice(0, 6), publishableKeyToken.slice(-3)].join("***"),
    })

    publishableKey = createdApiKey
    logger.info("Created publishable API key.")
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableKey.id,
      add: [defaultSalesChannel.id],
    },
  })

  logger.info(`Bootstrap finished. Publishable key: ${publishableKeyToken}`)
}
