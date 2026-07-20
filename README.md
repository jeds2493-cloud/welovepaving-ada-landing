# We Love Paving · ADA Accessibility Upgrades (landing SEM)

Landing SEM estática e independiente para el servicio de mejoras de
accesibilidad ADA de We Love Paving (propiedades comerciales en el Norte de
California). La desplegamos por separado para que el equipo la pueda revisar sin
tocar el prototipo del sitio principal.

Salió de `welovepaving-prototype` y la movimos a la raíz del repo: la página que
vivía en `/lp/ada-accessibility-upgrades/` ahora se sirve en `/`, con sus assets
de `images/` y `video/` al lado. La página en sí no cambió, lo único que
reescribimos fueron los prefijos `../../images/` a `images/`.

## Estructura

```
index.html          la landing (11 secciones)
ada-landing.css     estilos autocontenidos, sin build
ada-landing.js      tracking, header sticky, lightbox, before/after, modales legales
legal/              copias aplanadas de las 3 páginas legales, se abren en modales
images/  video/     solo los assets que esta página usa
tools/              solo para build (excluido del deploy con .vercelignore)
```

## Correrla en local

Cualquier servidor estático desde la raíz del repo:

```
npx serve .
```

Ojo: los dos formularios son iframes cross-origin de `quote.welovepaving.com`, y
su CSP solo permite dominios `welovepaving` y `*.vercel.app`. En `localhost` se
ven en blanco. **Esto es lo esperado, no es un bug**: ya desplegados en Vercel
cargan bien.

## Decisiones que conviene conocer

- **`noindex`**: esta es una landing de tráfico pagado. La etiqueta
  `<meta name="robots">` la mantiene fuera de buscadores para que no canibalice
  las páginas ADA del sitio principal. El `canonical` sí apunta a
  `welovepaving.com/lp/ada-accessibility-upgrades/`, que es su casa final en
  producción, no este preview.
- **Formularios**: iframes que inyecta el loader de la librería de formularios de
  WLP. El loader se encarga de la validación, la atribución (utm/gclid/
  first-touch) y el redirect al thank-you. El `form_source` con prefijo `sem_*`
  es el que dispara la conversión de Google Ads, no lo cambien.
- **Modales legales**: las páginas legales en vivo están hechas con
  GenerateBlocks y su texto vive dentro de acordeones colapsados, así que no se
  pueden traer e inyectar tal cual. `tools/extract-legal.js` las aplana hacia
  `legal/`. Ver `tools/README.md`.
- **Foto del hero**: va envuelta en `<picture>` para que en móvil (donde está en
  `display:none`) no se descarguen los 118KB que no se ven.
- **Cabeceras de seguridad** (`vercel.json`): `nosniff`, referrer policy
  estricta, framing en `SAMEORIGIN`, un `Permissions-Policy` que apaga las
  funciones que la página nunca usa, y HSTS. Pusimos `SAMEORIGIN` en lugar de
  `DENY` porque la página va a rearmarse dentro de WordPress y puede necesitar
  verse en un frame; aun así bloquea clickjacking de terceros. El HSTS va a
  propósito **sin** `includeSubDomains`, porque el dominio final se comparte con
  `quote.welovepaving.com` y forzar ese subárbol no es decisión de este repo.
  **No** pusimos un `Content-Security-Policy` completo: la página carga Google
  Fonts y el iframe de formulario cross-origin, así que la CSP hay que
  escribirla y probarla contra esos orígenes antes de activarla. Una CSP mal
  puesta rompe los formularios en silencio y ahí se pierden leads.

El destino es WordPress (GeneratePress/GenerateBlocks). Este repo es el
prototipo de revisión, no la casa de producción.
