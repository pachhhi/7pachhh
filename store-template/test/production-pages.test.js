import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { products } from '../products.js';
import { siteContact } from '../site-config.js';
import { storeConfig, validateStoreConfig } from '../config/store-config.js';

const root = new URL('../', import.meta.url);
const pages = ['index.html', 'checkout.html', 'order.html', 'privacy.html', 'terms.html', '404.html'];

test('Railway deployment runs migrations before start and checks application readiness', async () => {
  const config = JSON.parse(await readFile(new URL('../railway.json', import.meta.url), 'utf8'));
  assert.equal(config.build.builder, 'RAILPACK');
  assert.equal(config.build.buildCommand, 'npm ci --omit=dev');
  assert.deepEqual(config.deploy.preDeployCommand, ['npm run db:migrate']);
  assert.equal(config.deploy.startCommand, 'npm start');
  assert.equal(config.deploy.healthcheckPath, '/health');
  assert.equal(config.deploy.restartPolicyType, 'ALWAYS');
});

test('production pages include viewport, description and favicon metadata', async () => {
  for (const page of pages) {
    const html = await readFile(new URL(page, root), 'utf8');
    assert.match(html, /name="viewport"/i, page);
    assert.match(html, /name="description"/i, page);
    assert.match(html, /rel="icon"/i, page);
  }
});

test('navigation targets and referenced production images exist', async () => {
  for (const path of ['privacy.html', 'terms.html', 'img/logo.svg', 'img/favicon.svg', 'img/sample-product.svg']) await access(new URL(path, root));
  const productsModule = await import('../products.js');
  for (const product of productsModule.products) {
    const images = Array.isArray(product.images) ? product.images : Object.values(product.images);
    for (const image of images) await access(new URL(`..${image}`, import.meta.url));
  }
  for (const page of pages) {
    const html = await readFile(new URL(page, root), 'utf8');
    assert.equal(html.includes('/studio/'), false, `${page} references the removed Studio route`);
    assert.equal(html.includes('/returns.html'), false, `${page} references the removed Returns page`);
  }
});

test('configured brand assets exist and every page exposes shared branding hooks', async () => {
  for (const asset of [storeConfig.brand.logo, storeConfig.brand.favicon, storeConfig.brand.hero.image]) {
    await access(new URL(`..${asset}`, import.meta.url));
  }
  for (const page of pages) {
    const html = await readFile(new URL(page, root), 'utf8');
    assert.match(html, /data-brand-logo/, page);
    assert.match(html, /data-store-navigation/, page);
  }
});

test('store configuration is valid and commerce integrations are disabled by default', () => {
  assert.deepEqual(validateStoreConfig(), []);
  assert.deepEqual(storeConfig.features, { cart: true, payments: false, shipping: false, pickup: true });
  assert.ok(storeConfig.navigation.length > 0);
  assert.ok(storeConfig.contact.location);
  assert.deepEqual(validateStoreConfig({ ...storeConfig, features: { cart: true, payments: true, shipping: false, pickup: false } }),
    ['enable shipping or pickup before accepting payments']);
  assert.deepEqual(validateStoreConfig({ ...storeConfig, features: { cart: false, payments: true, shipping: false, pickup: true } }),
    ['enable cart before accepting payments']);
});

test('cart image fallback and responsive menu behavior are retained', async () => {
  const catalog = await readFile(new URL('../catalog.js', import.meta.url), 'utf8');
  const shared = await readFile(new URL('../shared.css', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../store-ui.js', import.meta.url), 'utf8');
  assert.match(catalog, /productImages\(product\)\[0\] \|\| '\/img\/sample-product\.svg'/);
  assert.match(shared, /\.mobile-menu-toggle\s*\{[\s\S]*display:\s*none/);
  assert.match(shared, /header\.is-menu-open\s*>\s*nav/);
  assert.match(ui, /aria-expanded/);
});

test('web product images are bounded for production delivery', async () => {
  const productsModule = await import('../products.js');
  const webImages = productsModule.products.flatMap(product => Array.isArray(product.images) ? [] : Object.values(product.images));
  for (const image of webImages) assert.ok((await stat(new URL(`..${image}`, import.meta.url))).size < 400_000, `${image} is too large`);
});

test('store exposes generic configurable example products', () => {
  const names = products.map(product => product.name);
  assert.ok(names.length > 0);
  assert.ok(products.every(product => product.id.startsWith('sample-')));
  assert.ok(products.every(product => product.price > 0 && product.available === true));
});

test('example products use neutral local image placeholders', () => {
  assert.ok(products.every(product => Array.isArray(product.images)));
});

test('Spanish and English translation catalogs contain the same keys', async () => {
  const { translations } = await import('../i18n.js');
  assert.deepEqual(Object.keys(translations.es).sort(), Object.keys(translations.en).sort());
  assert.equal(Object.values(translations.es).every(Boolean), true);
});

test('creative service sections are excluded from the storefront', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /studio-services|service__content|creative service/i);
});

test('official commercial email is centralized and linked from contact and legal pages', async () => {
  assert.equal(siteContact.email, storeConfig.contact.email);
  const contactScript = await readFile(new URL('../contact.js', import.meta.url), 'utf8');
  const legalScript = await readFile(new URL('../legal.js', import.meta.url), 'utf8');
  assert.match(contactScript, /`mailto:\$\{siteContact\.email\}`/);
  assert.match(legalScript, /mailto:\$\{siteContact\.email\}/);
  assert.equal(contactScript.includes('hello@example.com'), false);
  assert.equal(legalScript.includes('hello@example.com'), false);
});

test('checkout loads the official Mercado Pago browser SDK without embedded credentials', async () => {
  const checkout = await readFile(new URL('../checkout.html', import.meta.url), 'utf8');
  assert.match(checkout, /https:\/\/sdk\.mercadopago\.com\/js\/v2/);
  assert.doesNotMatch(checkout, /APP_USR|TEST-[A-Za-z0-9_-]{12,}/);
});

test('checkout renders delivery choices only inside the existing Shipping Method section', async () => {
  const checkout = await readFile(new URL('../checkout.js', import.meta.url), 'utf8');
  assert.doesNotMatch(checkout, /<legend>\$\{t\('deliveryMode'\)\}<\/legend>/);
  assert.doesNotMatch(checkout, /name="shippingSelection" value="home_delivery"|<strong>\$\{t\('homeDelivery'\)\}<\/strong>/);
  assert.match(checkout, /id="shipping-method-options" class="shipping-methods"><legend>\$\{t\('shippingMethod'\)\}<\/legend>[\s\S]*name="shippingSelection" value="coordinate"[\s\S]*name="shippingSelection" value="\$\{escapeHtml\(method\.id\)\}"/);
  assert.ok(checkout.indexOf('id="shipping-method-options"') < checkout.indexOf('id="delivery-address"'));
  assert.match(checkout, /data-enviopack-intent/);
  assert.match(checkout, /id="delivery-address" class="delivery-address" hidden/);
});

test('checkout address hidden state overrides its grid layout', async () => {
  const css = await readFile(new URL('../checkout.css', import.meta.url), 'utf8');
  assert.match(css, /\.delivery-address\[hidden\]\s*\{\s*display:\s*none;/);
  const html = await readFile(new URL('../checkout.html', import.meta.url), 'utf8');
  assert.match(html, /checkout\.css\?v=payment-ui-1/);
  assert.match(html, /checkout\.js\?v=payment-ui-1/);
});

test('checkout mounts the official payment Brick inline after delivery without a duplicate submit button', async () => {
  const checkout = await readFile(new URL('../checkout.js', import.meta.url), 'utf8');
  assert.ok(checkout.indexOf('id="delivery-address"') < checkout.indexOf('id="cardPaymentBrick_container"'));
  assert.match(checkout, /<fieldset class="shipping-methods payment-methods" aria-labelledby="payment-title">\s*<legend id="payment-title">\$\{t\('payment'\)\}<\/legend>/);
  assert.match(checkout, /class="payment-options"[\s\S]*t\('creditDebitCard'\)[\s\S]*t\('mercadoPago'\)/);
  assert.doesNotMatch(checkout, /<button type="submit"/);
  assert.match(checkout, /onSubmit: cardData => guardedIntegratedPayment/);
  assert.match(checkout, /order = await guardedCheckout[\s\S]*createPayment\(order\.id, cardData/);
  assert.match(checkout, /order\.total !== mountedAmount/);
  assert.doesNotMatch(checkout, /form\.elements/);
  assert.doesNotMatch(checkout, /payment-environment|payment-notice|testPaymentNotice/);
});

test('example products are purchasable and server-priced', () => {
  for (const product of products) {
    assert.equal(product.currency, 'ARS');
    assert.equal(Number.isInteger(product.price), true);
    assert.equal(product.available, true);
  }
});
