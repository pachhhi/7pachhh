import { storeConfig, validateStoreConfig } from './config/store-config.js';

const colorVariables = {
  background: '--bg', text: '--text', muted: '--muted', accent: '--accent', panel: '--panel', border: '--border'
};

function setAll(selector, value) {
  document.querySelectorAll(selector).forEach(node => { node.textContent = value; });
}

function applyHead() {
  document.documentElement.lang = storeConfig.locale.defaultLanguage;
  const description = document.querySelector('meta[name="description"]');
  if (description?.dataset.storeDescription != null) description.content = storeConfig.brand.description;
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.content = storeConfig.theme.colors.background;
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = storeConfig.brand.favicon;
  let fonts = document.querySelector('[data-store-fonts]');
  if (storeConfig.theme.fonts.googleFontsUrl) {
    if (!fonts) {
      fonts = document.createElement('link');
      fonts.rel = 'stylesheet';
      fonts.dataset.storeFonts = '';
      document.head.append(fonts);
    }
    fonts.href = storeConfig.theme.fonts.googleFontsUrl;
  } else {
    fonts?.remove();
  }
  Object.entries(storeConfig.theme.colors).forEach(([key, value]) => {
    if (colorVariables[key]) document.documentElement.style.setProperty(colorVariables[key], value);
  });
  document.documentElement.style.setProperty('--font-heading', `'${storeConfig.theme.fonts.heading}', sans-serif`);
  document.documentElement.style.setProperty('--font-body', `'${storeConfig.theme.fonts.body}', sans-serif`);
}

function applyBrand() {
  setAll('[data-brand-name]', storeConfig.brand.name);
  setAll('[data-brand-short-name]', storeConfig.brand.shortName);
  setAll('[data-year]', new Date().getFullYear());
  document.querySelectorAll('[data-brand-logo]').forEach(image => {
    image.src = storeConfig.brand.logo;
    image.alt = storeConfig.brand.showNameBesideLogo ? '' : storeConfig.brand.name;
  });
  document.querySelectorAll('[data-brand-wordmark]').forEach(node => {
    node.textContent = storeConfig.brand.name;
    node.hidden = !storeConfig.brand.showNameBesideLogo;
  });
}

function applyNavigation() {
  document.querySelectorAll('[data-store-navigation]').forEach(nav => {
    const languages = storeConfig.locale.supportedLanguages
      .map(language => `<button type="button" data-language="${language}">${language.toUpperCase()}</button>`).join('');
    const suffix = nav.dataset.includeLanguage === 'true'
      ? `<div class="language-selector" role="group" aria-label="Language">${languages}</div>` : '';
    nav.innerHTML = storeConfig.navigation.map(link => `<a href="${link.href}">${link.label}</a>`).join('') + suffix;
  });
  document.querySelectorAll('[data-store-legal]').forEach(nav => {
    nav.innerHTML = `<a href="${storeConfig.legal.privacyPath}">PRIVACY</a><a href="${storeConfig.legal.termsPath}">TERMS</a>`;
  });
}

function initMobileMenu() {
  document.querySelectorAll('.mobile-menu-toggle').forEach(button => {
    const header = button.closest('header');
    const nav = document.getElementById(button.getAttribute('aria-controls'));
    if (!header || !nav) return;
    button.addEventListener('click', () => {
      const open = !header.classList.contains('is-menu-open');
      header.classList.toggle('is-menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });
    nav.addEventListener('click', event => {
      if (!event.target.closest('a')) return;
      header.classList.remove('is-menu-open');
      button.setAttribute('aria-expanded', 'false');
    });
  });
}

export function applyStoreConfig() {
  applyHead();
  applyBrand();
  applyNavigation();
  initMobileMenu();
  document.documentElement.dataset.storeConfig = validateStoreConfig().length ? 'invalid' : 'valid';
}

applyStoreConfig();
