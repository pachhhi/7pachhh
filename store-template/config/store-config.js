export const storeConfig = Object.freeze({
  brand: {
    name: 'YOUR BRAND',
    shortName: 'YOUR BRAND',
    logo: '/img/logo.svg',
    showNameBesideLogo: false,
    favicon: '/img/favicon.svg',
    description: 'A simple, configurable online store.',
    hero: {
      eyebrow: 'YOUR BRAND / COLLECTION',
      title: 'Your next collection starts here.',
      copy: 'Replace this text with your brand message.',
      showImage: false,
      image: '/img/sample-product.svg',
      imageAlt: 'Featured collection'
    }
  },
  theme: {
    colors: { background: '#0C0B0B', text: '#E6E6E6', muted: '#A7A3A3', accent: '#E6E6E6', panel: '#161414', border: 'rgba(230,230,230,.2)' },
    fonts: { heading: 'Montserrat', body: 'Space Grotesk', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap' }
  },
  navigation: [{ label: 'STORE', href: '/#store' }, { label: 'CONTACT', href: '/#contact' }],
  contact: { email: 'hello@example.com', instagramHandle: null, instagramUrl: null, whatsappLabel: null, whatsappUrl: null, location: 'CITY / COUNTRY' },
  legal: { privacyPath: '/privacy.html', termsPath: '/terms.html' },
  locale: { defaultLanguage: 'en', supportedLanguages: ['en', 'es'] },
  features: { cart: true, payments: false, shipping: false, pickup: true }
});

export function validateStoreConfig(config = storeConfig) {
  const errors = [];
  if (!config?.brand?.name || !config.brand.shortName) errors.push('brand.name and brand.shortName are required');
  if (!config?.contact?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contact.email)) errors.push('contact.email must be valid');
  if (!Array.isArray(config?.navigation)) errors.push('navigation must be an array');
  if (['cart', 'payments', 'shipping', 'pickup'].some(key => typeof config?.features?.[key] !== 'boolean')) errors.push('all feature flags must be boolean');
  if (config?.features?.payments && !config.features.cart) errors.push('enable cart before accepting payments');
  if (config?.features?.payments && !config.features.shipping && !config.features.pickup) errors.push('enable shipping or pickup before accepting payments');
  return errors;
}
