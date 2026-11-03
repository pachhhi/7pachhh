import { createApp } from './app.js';
import { createRuntimeOrderRepository } from './orders/runtime-order-repository.js';
import { MercadoPagoProvider } from './payments/mercadopago-provider.js';
import { EnviopackProvider } from './shipping/enviopack-provider.js';
import { PaymentReconciler } from './payments/payment-reconciler.js';
import { resolveMercadoPagoEnvironment } from './payments/payment-environment.js';
import { storeConfig, validateStoreConfig } from '../config/store-config.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';
const databaseUrl = process.env.DATABASE_URL;
const paymentProviderName = process.env.PAYMENT_PROVIDER || 'none';

async function start() {
  const configErrors = validateStoreConfig();
  if (configErrors.length) {
    console.error(`Store startup failed: ${configErrors.join('; ')}`);
    process.exitCode = 1;
    return;
  }
  let orderRepository;
  let persistentOrders;
  try {
    ({ repository: orderRepository, persistent: persistentOrders } = createRuntimeOrderRepository({
      databaseUrl, nodeEnvironment: process.env.NODE_ENV
    }));
    await orderRepository.healthCheck();
  } catch (error) {
    console.error(`Store startup failed: ${error.message || error.code || error.name}`);
    await orderRepository?.close().catch(() => {});
    process.exitCode = 1;
    return;
  }
  if (!persistentOrders) console.warn('Store preview mode: DATABASE_URL is not configured; orders are stored in memory and are lost on restart.');
  let paymentProvider = null;
  let paymentEnvironment = process.env.PAYMENT_ENV || 'test';
  let mercadoPagoPublicKey = '';
  let mercadoPagoAccessToken = '';
  let webhookSecret = '';
  const shippingProvider = new EnviopackProvider({ apiKey: process.env.ENVIOPACK_API_KEY, secretKey: process.env.ENVIOPACK_SECRET_KEY,
    enabled: storeConfig.features.shipping && process.env.ENVIOPACK_ENABLED === 'true' });
  try {
    if (storeConfig.features.payments && paymentProviderName === 'none') throw new Error('PAYMENT_PROVIDER must be configured when features.payments is enabled.');
    if (paymentProviderName === 'mercadopago' && !storeConfig.features.payments) throw new Error('Enable features.payments before configuring a payment provider.');
    if (paymentProviderName === 'mercadopago') {
      if (!persistentOrders) throw new Error('DATABASE_URL is required before enabling payments.');
      ({ environment: paymentEnvironment, publicKey: mercadoPagoPublicKey, accessToken: mercadoPagoAccessToken,
        webhookSecret } = resolveMercadoPagoEnvironment(process.env));
      if (!mercadoPagoPublicKey) throw new Error('Mercado Pago public key is required.');
      if (paymentEnvironment === 'production' && !webhookSecret) throw new Error('Mercado Pago production webhook secret is required.');
      paymentProvider = new MercadoPagoProvider({ accessToken: mercadoPagoAccessToken, environment: process.env.PAYMENT_ENV });
    } else if (paymentProviderName !== 'none') throw new Error('Unsupported payment provider.');
    if (storeConfig.features.shipping && !shippingProvider.isConfigured()) throw new Error('Enviopack credentials and ENVIOPACK_ENABLED=true are required when features.shipping is enabled.');
  } catch (error) {
    console.error(`Store startup failed: ${error.message}`); await orderRepository.close(); process.exitCode = 1; return;
  }
  const app = createApp({ orderRepository, paymentProvider, paymentPublicKey: mercadoPagoPublicKey,
    paymentEnvironment, webhookSecret, publicBaseUrl: process.env.PUBLIC_BASE_URL || '', shippingProvider,
    commerceFeatures: storeConfig.features });
  const reconciler = paymentProvider ? new PaymentReconciler({ orderRepository, orderService: app.locals.orderService, paymentProvider }) : null;
  const server = app.listen(port, host, () => {
    console.log(`Store listening on ${host}:${port} (${persistentOrders ? 'PostgreSQL orders' : 'in-memory preview'}, ${paymentProvider ? `mercadopago ${paymentEnvironment}` : 'payments disabled'}, ${shippingProvider.isConfigured() ? 'enviopack enabled' : 'shipping disabled'})`);
    reconciler?.start();
  });
  const shutdown = () => server.close(() => Promise.resolve(reconciler?.stop()).then(() => orderRepository.close()).finally(() => process.exit(0)));
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}

start();
