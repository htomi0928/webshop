# Order Ops and Payment Domain

This project now includes a custom `order-ops` backend module for operational order state and payment tracking.

## What it adds

- `order_state`
  - one summary record per order
  - custom workflow status
  - custom payment status
  - custom fulfillment status
  - external payment references and notes

- `order_status_event`
  - append-only timeline for operational and payment events

- `payment_record`
  - payment attempt / callback / status history preparation
  - provider, provider reference, idempotency key, raw payload

## Admin API

- `GET /admin/order-ops/orders`
  - list recent orders with attached ops state

- `GET /admin/order-ops/orders/:id`
  - retrieve one order with:
    - core order data
    - custom ops state
    - timeline events
    - payment records

- `POST /admin/order-ops/orders/:id/status`
  - update custom workflow status
  - append a timeline event

- `POST /admin/order-ops/orders/:id/payments`
  - create a payment record
  - update the order's custom payment summary
  - append a payment timeline event

## Automatic initialization

The subscriber `src/subscribers/order-placed.ts` initializes an `order_state` record and adds a `placed` timeline event when an order is created.

## SimplePay callback

Current implementation is available at:

- `POST /store/simplepay/callback`

Behavior:

- optional/required signature validation by env
- idempotent `payment_record` write via `idempotency_key`
- `order_state` payment status sync
- timeline event append in `order_status_event`

Related env vars:

- `SIMPLEPAY_SIGNATURE_HEADER` (default: `x-simplepay-signature`)
- `SIMPLEPAY_SIGNATURE_ALGORITHM` (default: `sha256`)
- `SIMPLEPAY_REQUIRE_SIGNATURE` (default: `true`)

## Suggested next steps

1. Align signature payload canonicalization with your exact SimplePay contract.
2. Add admin widgets to show order timeline and payment attempts.
3. Add stricter transition rules between workflow statuses.
4. Add customer-facing order tracking route.

## Migration note

Because this feature introduces a new custom Medusa module, make sure you generate and run database migrations for the new models before using it in a fresh environment.
