# 7pachhh / Store

An HTML/CSS/JavaScript website with a small Express backend for the catalog, cart,
checkout, and internal orders. Mercado Pago is integrated through Card Payment
Brick and Checkout API Orders, with explicit selection between test and production.

## Design principles

| Observable decision | Practical rationale | Trade-off |
| --- | --- | --- |
| The server resolves the product, variant, price, and currency against the catalog again | The browser is not a trustworthy source for calculating an order amount. | Catalog changes must remain compatible across the presentation layer and server validation. |
| Orders are written to PostgreSQL using transactions and idempotency keys | Retrying a request after a failure or timeout should not create duplicate orders or payments. | Requires PostgreSQL and applying migrations before running the corresponding version. |
| Each payment operation has a durable `payment_attempt` separate from the order | Preserves provider references and allows status checks without creating the payment again. | More states and records to manage; reconciliation is part of the commerce workflow. |
| Webhooks, reconciliation, and public responses have explicit boundaries | Confirmation does not rely solely on the browser redirect; public pages must not reveal buyer information. | A payment may remain in processing or require review when the provider response is ambiguous. |
| Test and production use separate settings and credentials | Reduces the risk of mixing test payments with real credentials. | Each environment requires its own configuration and validation. |
| 7pachhh Ops is local and read-only | Allows order inspection without exposing a public administration interface with write access. | Available only locally; remote access would require additional authentication. |
| Shipping quotes are disabled when data or credentials are missing | Avoids displaying fabricated or unverifiable rates. | Without valid configuration, checkout cannot display real quotes. |

These principles describe the trade-offs visible in the implementation, rather than reconstructing the historical intent behind every decision.

## Reusable store template

A standalone starting point is included in [`store-template/`](store-template/).
Copy that directory into a new project to build another store from the shared
base. It has its own configuration, dependencies, sample catalog, placeholder
assets, backend, migrations, and tests. It is a reusable baseline, not a copy of
the current 7pachhh branding or catalog.

From this repository's root, choose a new destination directory:

```sh
cp -R store-template ../my-store
cd ../my-store
npm ci
npm start
```

Customize `config/store-config.js`, `products.js`, and the assets in `img/`.
See the [template README](store-template/README.md) for configuration and setup.
The template starts in preview mode without `.env`; orders are held in memory,
and payments and shipping are disabled. Each real store needs its own environment
configuration, database, credentials, and deployment. If 7pachhh is already using
port 3000, start the copied template with `PORT=3001 npm start`.

Installed dependencies, private environment files, and local agent configuration
are excluded from the bundled copy. The `store-template/` directory is available
in the repository but is not served by the 7pachhh storefront.

## Run

```sh
npm install
npm start
```

Open `http://localhost:3000`. To run the tests:

```sh
npm test
```

The HTTP suite uses Supertest and may require permission to open ephemeral local
sockets in sandboxed environments. Coverage: `npm run test:coverage`.

## Commerce architecture

- `products.js`: shared catalog. The browser uses it to display products, and the
  server uses it as the authoritative source of prices.
- `catalog.js`: navigation and rendering for the catalog, product details, and cart panel.
- `cart-store.js`: local persistence and tolerance of `localStorage` failures.
- `cart-service.js`: cart validation and operations, without DOM dependencies.
- `checkout.html`, `checkout.js`, `checkout.css`: order summary, buyer information,
  and internal order creation. They never send prices to the server.
- `server/catalog`: server-side resolution of product, variant, price, and currency.
- `server/orders`: model, state machine, and repository contract with in-memory
  and PostgreSQL implementations.
- `server/payments`: payment-provider contract and adapter, persisted attempts, and reconciliation.
- `server/app.js`: API and static files.

Current flow:

```text
Catalog -> Cart (localStorage) -> Checkout -> POST /api/checkout
        -> validate against catalog -> internal order (pending)
```

At runtime, orders, items, idempotency keys, and payment attempts are stored in
PostgreSQL. The in-memory repository is used only in unit tests.

## Internal API

- `POST /api/checkout`: prepares an internal order from checkout.
- `POST /api/shipping/quotes`: quotes shipping methods for the cart.
- `GET /api/public/orders/:publicOrderId`: returns a sanitized confirmation,
  without buyer information or an address.

The creation payload contains only items (`productId`, `variantId`, `color`,
`quantity`) and basic buyer information. Any client-supplied price is ignored;
subtotal and total are always calculated using the server catalog.

## Payment integration and verification status

The contract, Mercado Pago adapter, attempt persistence, state machine, and webhook
are implemented. The storefront loads Card Payment Brick from the official SDK,
obtains only the Public Key from the backend, and sends the resulting token to
the payment endpoint. It can also initiate Checkout Pro.

The project owner confirmed a successful end-to-end purchase. This verifies the
successful path exercised; it does not by itself mean that all provider states
have been validated, such as rejection, pending payment, refund, or chargeback.
The available automated and integration tests are described below and in their
corresponding scripts.

Credentials must not be added to the repository; `.env.example` contains only
illustrative values.

## PostgreSQL

The runtime uses `PostgresOrderRepository`; `InMemoryOrderRepository` is retained
for unit tests. PostgreSQL and two separate databases are required, for example:

```sql
CREATE DATABASE lain_store_dev;
CREATE DATABASE lain_store_test;
```

Copy `.env.example` to `.env` or export the variables without committing credentials:

```sh
export DATABASE_URL=postgresql://user:password@localhost:5432/lain_store_dev
export TEST_DATABASE_URL=postgresql://user:password@localhost:5432/lain_store_test
npm run db:migrate
npm start
```

Migrations:

```sh
npm run db:migrate
npm run db:rollback
```

`db:rollback` reverts the latest migration in `DATABASE_URL`; it must not point to
production during development. To reset the development database, run rollback
and then migrate.

PostgreSQL tests use only `TEST_DATABASE_URL`. It can be stored in a local
`.env.test`, using `.env.test.example` as a template. Setup rejects database names
that do not contain `test`, rejects the same URL as `DATABASE_URL`, attempts to
create the database if it does not exist, and applies migrations:

```sh
npm run test:postgres
npm run test:all
```

`npm test` runs only the suite without PostgreSQL. `npm run test:all` is the full
command and does not allow PostgreSQL tests to be skipped.

The schema persists `orders`, `order_items`, `idempotency_keys`, and
`payment_attempts`. All amounts are `BIGINT` values in minor units. Order + items
+ idempotency creation occurs in a single transaction. Order updates use `version`
for optimistic concurrency control; payment claims use a transaction and
`SELECT ... FOR UPDATE` on the order.

## Mercado Pago — test and production

The integration remains disabled with `PAYMENT_PROVIDER=none`. The environment
is explicitly selected with `PAYMENT_ENV=test|production`. For tests, the legacy
variables shown below are accepted; their `MERCADOPAGO_TEST_*` equivalents and
`MP_TEST_WEBHOOK_SECRET` can also be used:

```sh
PAYMENT_PROVIDER=mercadopago
PAYMENT_ENV=test
MERCADOPAGO_ACCESS_TOKEN=<test access token, backend only>
MERCADOPAGO_PUBLIC_KEY=<test public key>
MP_WEBHOOK_SECRET=<test webhook secret>
PUBLIC_BASE_URL=https://example.test
```

Production requires separate variables and does not reuse generic credentials:

```sh
PAYMENT_PROVIDER=mercadopago
PAYMENT_ENV=production
MERCADOPAGO_PRODUCTION_ACCESS_TOKEN=<production access token, backend only>
MERCADOPAGO_PRODUCTION_PUBLIC_KEY=<production public key>
MP_PRODUCTION_WEBHOOK_SECRET=<production webhook secret>
```

The Access Token and secret are never sent to the browser; `/api/payments/config`
exposes only the Public Key and active environment. The storefront loads the
official SDK for Card Payment Brick. The payment section allows users to keep
that flow or initiate Checkout Pro through a manual order and its `checkout_url`;
its return URLs use `PUBLIC_BASE_URL`, but confirmation always checks the local
state. The Card Brick supports credit cards only. The Brick provides the token,
`payment_method_id`, `issuer_id`, and installments; the backend sets and validates
`payment_method.type=credit_card`. Debit and prepaid cards are explicitly rejected
rather than classified as credit cards. At this stage, the allowlist is `visa`,
`master`, and `amex`; it must be deliberately expanded when enabling other methods.

```text
internal order -> durable payment_attempt -> MercadoPagoProvider
-> provider result/webhook -> OrderService state policy -> PostgreSQL
```

Each `payment_attempt` uses its persisted UUID as the `X-Idempotency-Key` sent to
Mercado Pago. A timeout remains `processing`; a retry does not create the payment
again. Server-side reconciliation queries `/v1/orders/:id` and uses the separately
persisted `ORD…` and `PAY…` IDs.

The backend also runs reconciliation at startup and every five minutes.
PostgreSQL assigns each attempt using `FOR UPDATE SKIP LOCKED` and a short lease,
so two processes do not query the same payment simultaneously. If a timeout
occurred before the `ORD…` ID was saved, the order is searched by the attempt UUID
in `external_reference` within a time window, then confirmed by ID.
`POST /v1/orders` is never automatically repeated. Approved payments, partially
refunded payments, and recent chargebacks are checked again every six hours
within a bounded 30-day window to detect refunds and reversals without downgrading
a final state because of stale information.

Errors 429, 5xx, and timeouts use bounded backoff. After eight failures, or when
references, amounts, or identifiers do not match, the attempt is flagged for
review and a structured log is emitted with the `paymentAttemptId`, without
tokens. To operate without querying PostgreSQL directly, find that ID in the
logs and check the order's public status; there is no HTTP endpoint for manual
reconciliation. Any future administrative write action must be implemented in
7pachhh Ops with authentication before being exposed remotely.

Endpoints:

- `POST /api/orders/:id/payments`: starts or recovers the idempotent attempt.
- `GET /api/payments/config`: returns only the active Public Key and environment.
- `POST /api/webhooks/mercadopago`: receives and verifies notifications.

Migration `002_mercadopago_attempts.sql` adds the durable provider idempotency key.
Full provider payloads and PCI data are not persisted.

## Idempotency and current limitations

`POST /api/checkout` requires `Idempotency-Key`. The key is stored alongside a
payload fingerprint in `idempotency_keys`: an identical retry returns the same
order, and reuse with a different payload returns 409. Payment initiation uses
the same mechanism; while a call is in progress, all retries with the same key
share its promise. The transactional transition to `awaiting_payment`, under a
row lock, prevents another key from starting a second payment for the same order.

PostgreSQL preserves keys across restarts and coordinates multiple processes
using constraints, transactions, and row locking. The shared promise in Node is
only a local optimization; the actual guarantee is in PostgreSQL. Before
production, rate limiting must be added in front of `/api`, ideally at the proxy
and also as middleware.

## ENVIOPACK SETUP

This phase only queries home-delivery rates; it does not create shipments,
labels, tracking, webhooks, or post-payment automation. Weights and dimensions
live in `products.js` and must be populated with real measurements before quoting
a product.

1. Create an Enviopack account and obtain the API Key and Secret Key.
2. Configure the backend:

```sh
ENVIOPACK_API_KEY=<api key>
ENVIOPACK_SECRET_KEY=<secret key>
ENVIOPACK_ENABLED=true
```

3. Restart the backend, open checkout, and enter the province and postal code.
4. Verify that real quotes appear under `SHIPPING METHOD`.

The isolated live check (not part of `npm test`) is run with:

```sh
npm run test:enviopack-live
```

Credentials and the access token are never exposed to the browser. With
`ENVIOPACK_ENABLED=false` or incomplete credentials, the endpoint returns
`shipping_provider_not_configured` without fabricating rates.

## 7pachhh Ops — local only

7pachhh Ops is a separate read-only application for inspecting orders from the
same PostgreSQL database. It does not run migrations automatically. Apply
migrations through the usual process first, then start Ops:

```sh
npm run db:migrate
npm run ops
```

Open only `http://127.0.0.1:4000`. The process always binds to `127.0.0.1`, even
when a different `OPS_PORT` is configured, and can run alongside `npm start`.
This V1 has no login because it is localhost-only. Before exposing it remotely,
authentication or a layer such as Cloudflare Access must be added; it must not be
published as-is.

The list includes a dedicated section for attempts that require manual review.
Each order's details include `provider_order_id`, `provider_payment_id`, failure
count, and the latest safe reconciliation error code. Ops does not allow state
changes or payment retries.

## Technical release sequence

1. Start from a clean commit that includes all numbered migrations.
2. Install exactly what the lockfile specifies with `npm ci --omit=dev`.
3. Load environment variables outside the repository.
4. Run `npm run db:migrate` once before starting the new version.
5. Run `npm start` under the chosen supervisor and check the PostgreSQL health log.
6. Start Ops only on loopback when needed, accessing it through a private tunnel.

The production proxy must terminate HTTPS, enforce HTTP-to-HTTPS redirects, and
apply rate limiting. The PostgreSQL provider must have automated backups and a
verified restore procedure. These responsibilities are not implemented inside
the Node process.

## Railway

`railway.json` configures Railpack, reproducible installation using the lockfile,
pre-deploy migrations, `npm start`, automatic restarts, and the `/health` health
check. The server explicitly listens on `0.0.0.0` and uses the `PORT` injected
by Railway. The health check returns `503` if PostgreSQL is unavailable and does
not expose connection details.

For the first public deployment, configure the web service in safe mode, without
payments or external quotes. This allows the homepage to be published and
inquiries to be received without accepting sales before E2E tests are complete:

```text
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
PAYMENT_PROVIDER=none
PAYMENT_ENV=test
PUBLIC_BASE_URL=https://<public-railway-domain>
ENVIOPACK_ENABLED=false
```

Do not load production credentials for this first deployment. To validate checkout
in a separate environment, use TEST credentials, configure the `Order (Mercado Pago)`
event to point to `https://<test-domain>/api/webhooks/mercadopago`, and test Card
Payment Brick and Checkout Pro end to end. Only after verifying approved,
rejected, and pending payments, return URLs, webhooks, reconciliation, persisted
orders, and shipping quotes/pickup should you switch to `PAYMENT_ENV=production`,
load only the `MERCADOPAGO_PRODUCTION_*` and `MP_PRODUCTION_WEBHOOK_SECRET`
variables, and enable `ENVIOPACK_ENABLED=true` with its credentials. Make the
change in a controlled deployment followed by a real purchase for a minimal amount.

Use the private `DATABASE_URL` reference from the PostgreSQL service within the
same project; do not configure `DATABASE_PUBLIC_URL` in the application or enable
the database TCP Proxy. Railway's private network already encrypts internal traffic.

Initially deploy a single replica and keep Serverless/App Sleeping disabled: the
reconciler starts with the backend, persists its leases and state in PostgreSQL,
and needs the process to remain active to run its five-minute cycle. Its
PostgreSQL locks allow another replica to be added later.

Ops is not part of the web process, and its bind address remains fixed at
`127.0.0.1:4000`. Do not create a public domain for it or map that port. For the
first deployment it can remain stopped; any future remote access requires an
authenticated private tunnel or gateway.

### Smoke test and rollback

After each deployment, check the following in order: `GET /health` returns 200,
the homepage and `contact.js` load, the ES/EN selector works, the STUDIO and STORE
anchors navigate, the catalog filters products, and the public API does not
expose internal data. With payments disabled, `GET /api/payments/config` must
report `configured: false`. In the TEST environment, also complete a test of each
payment flow and confirm the final state through the public order and PostgreSQL.

If the health check fails, do not promote the deployment. If a failure appears
afterward, restore the previous deployment through Railway; the current migrations
are additive, so the previous version tolerates migration `009`. Run
`npm run db:rollback` only with a verified backup and only if the decision is made
to remove that migration as well; never use it as the first response to an app failure.
