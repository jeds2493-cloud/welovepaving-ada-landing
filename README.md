# We Love Paving · ADA Accessibility Upgrades (landing SEM)

Landing SEM estática e independiente para el servicio de mejoras de
accesibilidad ADA de We Love Paving (propiedades comerciales en el Norte de
California).

**Este es el repo de producción.** La landing se publica tal cual está aquí, con
este código. No se rearma en un page builder: el HTML, CSS y JS de este repo son
los que salen a producción. El despliegue puede pasar por WordPress, pero la
página no se reconstruye con GeneratePress ni GenerateBlocks.

Vive en su propio repo, separada del sitio principal, para que se pueda publicar
y actualizar sin tocar nada más.

## Estructura

```
index.html          la landing (11 secciones)
ada-landing.css     estilos autocontenidos, sin build
ada-landing.js      tracking, header sticky, lightbox, before/after, modales legales
legal/              copias aplanadas de las 3 páginas legales, se abren en modales
images/  video/     solo los assets que esta página usa
tools/              solo para build (excluido del deploy con .vercelignore)
vercel.json         cabeceras de seguridad
```

No hay build ni dependencias: se sirve tal cual.

## Correrla en local

Cualquier servidor estático desde la raíz del repo:

```
npx serve .
```

Ojo: los dos formularios son iframes cross-origin de `quote.welovepaving.com`, y
su CSP solo permite dominios `welovepaving` y `*.vercel.app`. En `localhost` se
ven en blanco. **Esto es lo esperado, no es un bug**: ya desplegados cargan bien.

## Seguridad

### Cabeceras (`vercel.json`)

Se sirven en todas las rutas. Si el despliegue final no pasa por Vercel, **hay
que replicarlas en el servidor que se use**, porque este archivo solo lo lee
Vercel.

| Cabecera | Qué hace |
|---|---|
| `X-Content-Type-Options: nosniff` | Evita que el navegador adivine el tipo de archivo y termine ejecutando como script algo que no lo es. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Al salir a otro dominio solo se manda el origen, no la URL completa con sus parámetros de campaña. |
| `X-Frame-Options: SAMEORIGIN` | Impide que un tercero meta la página en un iframe para robar clics (clickjacking). |
| `Permissions-Policy` | Apaga cámara, micrófono, geolocalización, pagos y USB. La página nunca los usa, así que se niegan de entrada. |
| `Strict-Transport-Security` | Obliga HTTPS en visitas siguientes. |

Dos decisiones deliberadas:

- **`SAMEORIGIN` y no `DENY`**: si el despliegue pasa por WordPress en el mismo
  dominio, `DENY` podría romper una vista previa o una plantilla que la
  encuadre. `SAMEORIGIN` deja pasar el mismo origen y sigue bloqueando a
  terceros, que es el riesgo real.
- **HSTS sin `includeSubDomains`**: el dominio final se comparte con
  `quote.welovepaving.com`. Forzar HTTPS en todo ese subárbol afecta servicios
  que no dependen de este repo, así que esa decisión no se toma desde aquí.

### CSP: pendiente a propósito

**No** hay `Content-Security-Policy` todavía, y es una decisión consciente, no un
olvido. La página carga Google Fonts y el iframe de formulario cross-origin, así
que una CSP tiene que escribirse y probarse contra esos orígenes antes de
activarse. **Una CSP mal puesta rompe los formularios en silencio**: la página
se ve bien y los leads dejan de entrar sin que nadie se entere.

Para cuando se haga, tiene que permitir al menos: `quote.welovepaving.com`
(frame), `fonts.googleapis.com` y `fonts.gstatic.com`. Conviene arrancarla en
modo `Report-Only` y verificarla enviando un formulario de prueba de punta a
punta antes de forzarla.

### Qué se auditó

Revisión del árbol de archivos y del historial completo de git:

- **Sin credenciales**: no hay API keys, tokens, llaves privadas ni contraseñas,
  ni en los archivos actuales ni en commits anteriores.
- **Sin datos personales**: los únicos contactos son corporativos y públicos
  (`contact@welovepaving.com` y el teléfono de la campaña).
- **Sin rutas locales** ni nombres de usuario de nuestras máquinas.
- **Sin código de depuración** en lo que se publica. Los `console.log` que hay
  viven en `tools/`, que está excluido del deploy.
- **XSS**: los usos de `innerHTML` reciben únicamente datos que están escritos en
  el repo (`data-legal-src`, `href`) y el `fetch` es al mismo origen. Nada viene
  de input del usuario.
- **Enlaces externos**: todos los `target="_blank"` llevan `rel="noopener"`, así
  que la pestaña destino no puede manipular la nuestra.

**Salidas a dominios externos** (todas necesarias): `welovepaving.com`,
`quote.welovepaving.com` (formularios), Google Fonts, y un enlace al PDF público
de la garantía alojado en Elfsight. Ese último es solo un enlace, no un script de
terceros cargado en la página.

### Guardas del repo

`.gitignore` bloquea `.env*`, `*.local`, `*.pem` y `*.key` para que un secreto no
se pueda subir por accidente. `tools/` no se despliega (`.vercelignore`).

## Decisiones que conviene conocer

- **`noindex`**: esta es una landing de tráfico pagado. La etiqueta
  `<meta name="robots">` la mantiene fuera de buscadores para que no canibalice
  las páginas ADA del sitio principal. El `canonical` apunta a
  `welovepaving.com/lp/ada-accessibility-upgrades/`. **Si en algún momento se
  espera tráfico orgánico, hay que quitar el `noindex` a mano.**
- **Formularios**: iframes que inyecta el loader de la librería de formularios de
  WLP. El loader se encarga de la validación, la atribución (utm/gclid/
  first-touch) y el redirect al thank-you. El `form_source` con prefijo `sem_*`
  es el que dispara la conversión de Google Ads, no lo cambien.
- **Modales legales**: las páginas legales del sitio vivo están hechas con
  GenerateBlocks y su texto vive dentro de acordeones colapsados, así que no se
  pueden traer e inyectar tal cual. `tools/extract-legal.js` las aplana hacia
  `legal/`. Ver `tools/README.md`. **Cuando Legal edite una página hay que
  regenerar esas copias**, no se actualizan solas.
- **Foto del hero**: va envuelta en `<picture>` para que en móvil (donde está en
  `display:none`) no se descarguen los 118KB que no se ven.

## Antes de publicar

1. Confirmar la decisión del `noindex`.
2. Verificar que los formularios cargan y envían en el dominio final (en
   `localhost` siempre se ven en blanco).
3. Si el hosting no es Vercel, replicar las cabeceras de `vercel.json`.
4. Revisar que las copias de `legal/` estén al día con lo que publicó Legal.
