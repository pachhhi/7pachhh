import { initLanguageSelector } from './language-selector.js';
import { siteContact } from './site-config.js';
import { storeConfig } from './config/store-config.js';
import './store-ui.js';

const root = document.querySelector('#legal-content');
const page = document.body.dataset.legalPage;
const content = {
  privacy: {
    en: ['Privacy Policy', [['Information collected', 'This store collects only the information needed to create and manage an order or answer a direct enquiry.'], ['Use of information', 'Order and contact information is used only to provide the requested service and support.'], ['Contact', 'Questions about personal information can be sent to:']]],
    es: ['Política de privacidad', [['Información recopilada', 'Esta tienda recopila únicamente la información necesaria para crear y gestionar una orden o responder una consulta directa.'], ['Uso de la información', 'Los datos de orden y contacto se utilizan sólo para prestar el servicio solicitado y brindar soporte.'], ['Contacto', 'Las consultas sobre datos personales pueden enviarse a:']]]
  },
  terms: {
    en: ['Terms', [['Scope', 'These terms apply to purchases offered directly by this store.'], ['Product information', 'Availability, price and product details shown at the time an order is created form the basis of that order.'], ['Contact', 'Questions about an order should include its public order ID and can be sent to:']]],
    es: ['Términos', [['Alcance', 'Estos términos se aplican a las compras ofrecidas directamente por esta tienda.'], ['Información de producto', 'La disponibilidad, el precio y los detalles mostrados al crear una orden constituyen la base de esa orden.'], ['Contacto', 'Las consultas sobre una orden deben incluir su identificador público y pueden enviarse a:']]]
  }
};

function render(language) {
  const [title, sections] = content[page][language];
  document.title = `${title} — ${storeConfig.brand.name}`;
  root.innerHTML = `<span>${storeConfig.brand.shortName} / INFORMATION</span><h1>${title}</h1>${sections.map(([heading, copy], index) => `<section><h2>${heading}</h2><p>${copy}${index === sections.length - 1 ? ` <a href="mailto:${siteContact.email}">${siteContact.email}</a>` : ''}</p></section>`).join('')}<p class="legal-review">${language === 'es' ? 'BORRADOR — Requiere revisión legal y datos comerciales definitivos antes de producción.' : 'DRAFT — Requires legal review and final commercial details before production.'}</p>`;
}

render(initLanguageSelector(render));
