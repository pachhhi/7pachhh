/** Replace these examples with this store's products. Prices are minor units. */
const SAMPLE_SHIPPING = Object.freeze({ weightKg: 0.3, widthCm: 30, lengthCm: 25, heightCm: 5, temporary: true });
const SIZES = ['S', 'M', 'L', 'XL'].map(size => ({ id: size, size, available: true }));
const description = Object.freeze({ en: 'A configurable sample product for your store.', es: 'Un producto de ejemplo configurable para tu tienda.' });

export const products = [
  { id: 'sample-tee', slug: 'sample-tee', name: 'Sample T-shirt', description, price: 30000, currency: 'ARS', category: 'apparel', images: [], variants: SIZES, colors: [], featured: true, available: true, shipping: SAMPLE_SHIPPING, createdAt: '2026-01-01' },
  { id: 'sample-accessory', slug: 'sample-accessory', name: 'Sample Accessory', description, price: 15000, currency: 'ARS', category: 'accessories', images: [], variants: [], colors: [], featured: true, available: true, shipping: SAMPLE_SHIPPING, createdAt: '2026-01-01' }
];

export const categories = [...new Set(products.map(product => product.category))];
