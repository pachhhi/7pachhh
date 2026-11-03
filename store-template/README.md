# Store Template

Plantilla e-commerce HTML/CSS/JavaScript con backend Express, catálogo, carrito, checkout, órdenes, PostgreSQL, migraciones, pagos y envíos. Está basada en la estructura funcional de LAIN Studio, pero es un proyecto independiente y no incluye datos ni activos comerciales de LAIN.

## Personalizar una tienda

1. Editá `config/store-config.js` para definir nombre, logo, favicon, colores, tipografías, hero, navegación, contacto y enlaces legales.
2. Reemplazá `products.js` con los productos de la marca. Los precios son minor units y el backend vuelve a validar catálogo, variantes y totales.
3. Reemplazá los placeholders de `img/` por activos propios de la marca.
4. Revisá el texto legal generado por `legal.js` y los datos de contacto antes de publicar.

Las opciones `features` controlan el comercio sin cambiar lógica interna:

- `cart`: permite agregar productos y abrir el carrito.
- `payments`: habilita el checkout y permite configurar Mercado Pago.
- `shipping`: habilita cotizaciones de Envíopack.
- `pickup`: habilita retiro o entrega coordinada sin costo de envío.

Pagos y envíos vienen deshabilitados. Para aceptar compras, habilitá `features.payments` y al menos una modalidad entre `shipping` y `pickup`; el servidor rechaza configuraciones o solicitudes incompatibles.

Cada instalación de producción debe usar su propio `.env`, `DATABASE_URL`, base PostgreSQL y despliegue. `NODE_ENV=production` exige `DATABASE_URL`. No copies credenciales entre tiendas.

## Ejecutar

```sh
npm install
npm start
```

Sin `.env`, la tienda inicia en modo de vista previa: las órdenes se guardan en memoria y se pierden al reiniciar. Pagos y envíos permanecen deshabilitados.

Para desarrollo persistente o producción, creá una base PostgreSQL independiente:

```sh
cp .env.example .env
npm run db:migrate
npm start
```

Por defecto `PAYMENT_PROVIDER=none` y `ENVIOPACK_ENABLED=false`. Activá pagos y envíos únicamente después de configurar credenciales propias y revisar el entorno (`test` o `production`).

## Pruebas

```sh
npm test
npm run test:coverage
npm run test:all
```

Las pruebas PostgreSQL requieren un `TEST_DATABASE_URL` separado y una base cuyo nombre contenga `test`. Nunca uses la base de producción.

## Ops

`ops/` es una herramienta privada de consulta local. Se enlaza exclusivamente a `127.0.0.1`; no debe publicarse sin autenticación y una capa de acceso adicional.

## Despliegue

Usá un despliegue y una base independientes por marca, configurá las variables de entorno en el proveedor de hosting, aplicá las migraciones y mantené pagos/envíos deshabilitados hasta completar la validación. No subas `.env`, tokens, pedidos ni datos personales al repositorio.
