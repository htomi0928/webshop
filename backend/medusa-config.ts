import {
  loadEnv,
  defineConfig,
  Modules,
  ContainerRegistrationKeys,
  TEMPORARY_REDIS_MODULE_PACKAGE_NAMES,
} from '@medusajs/framework/utils'
import path from "node:path"
import { ORDER_OPS_MODULE } from "./src/modules/order-ops"

loadEnv(process.env.NODE_ENV || 'development', path.resolve(process.cwd(), ".."))

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const authProviders: any[] = [
  {
    resolve: "@medusajs/medusa/auth-emailpass",
    id: "emailpass",
  },
]

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  authProviders.push({
    resolve: "@medusajs/medusa/auth-google",
    id: "google",
    options: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
  })
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: requireEnv("DATABASE_URL"),
    redisUrl: requireEnv("REDIS_URL"),
    http: {
      storeCors: requireEnv("STORE_CORS"),
      adminCors: requireEnv("ADMIN_CORS"),
      authCors: requireEnv("AUTH_CORS"),
      jwtSecret: requireEnv("JWT_SECRET"),
      cookieSecret: requireEnv("COOKIE_SECRET"),
    },
  },
  admin: {
    path: "/app",
  },
  modules: {
    [Modules.EVENT_BUS]: {
      resolve: TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.EVENT_BUS],
      options: {
        redisUrl: process.env.REDIS_URL,
        workerOptions: {
          concurrency: Number(process.env.EVENTS_CONCURRENCY || 1),
        },
      },
    },
    [Modules.CACHE]: {
      resolve: TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.CACHE],
      options: {
        redisUrl: process.env.CACHE_REDIS_URL || process.env.REDIS_URL,
      },
    },
    [Modules.WORKFLOW_ENGINE]: {
      resolve: TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.WORKFLOW_ENGINE],
      options: {
        redis: {
          url: process.env.REDIS_URL,
        },
      },
    },
    [Modules.LOCKING]: {
      options: {
        providers: [
          {
            id: "locking-redis",
            resolve: TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.LOCKING],
            is_default: true,
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },
    [Modules.AUTH]: {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: authProviders,
      },
    },
    [ORDER_OPS_MODULE]: {
      resolve: "./src/modules/order-ops",
    },
  },
})
