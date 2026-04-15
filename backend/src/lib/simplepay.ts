export type SimplePayConfig = {
  merchant: string
  secretKey: string
  sandbox: boolean
  successUrl: string
  failureUrl: string
  callbackUrl: string
}

export function getSimplePayConfig(): SimplePayConfig {
  return {
    merchant: process.env.SIMPLEPAY_MERCHANT || "",
    secretKey: process.env.SIMPLEPAY_SECRET_KEY || "",
    sandbox: process.env.SIMPLEPAY_SANDBOX !== "false",
    successUrl: process.env.SIMPLEPAY_SUCCESS_URL || "",
    failureUrl: process.env.SIMPLEPAY_FAILURE_URL || "",
    callbackUrl: process.env.SIMPLEPAY_CALLBACK_URL || "",
  }
}

export function isSimplePayConfigured(config = getSimplePayConfig()) {
  return Boolean(
    config.merchant &&
      config.secretKey &&
      config.successUrl &&
      config.failureUrl &&
      config.callbackUrl
  )
}
