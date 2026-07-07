# Kaizer-Front-Angular — Documentación técnica

Frontend web (SPA) del e-commerce **Kaizer Tech**. Catálogo con actualización en
tiempo real, carrito, checkout, autenticación JWT, perfil de usuario y panel de
administración. Consume el backend Spring Boot (`Kaizer-Back`) para escrituras y
lee el catálogo directamente de Supabase para tener datos en vivo.

---

## 1. Stack tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Angular (standalone, sin NgModules) | 22 |
| Lenguaje | TypeScript | ~6.0 |
| Estado | Angular **Signals** (`signal`, `computed`) | nativo |
| Build tool | `@angular/build:application` (esbuild/Vite) | 22 |
| Datos en vivo | `@supabase/supabase-js` (Postgres + Realtime) | 2.108 |
| HTTP | `HttpClient` + interceptores funcionales | nativo |
| Ruteo | Angular Router (lazy `loadComponent`) | nativo |
| Tests | Vitest + jsdom | 4.x |
| Formato | Prettier | 3.x |

> Proyecto generado con Angular CLI 22.0.4. Arquitectura **100% standalone**:
> no hay `AppModule`; el arranque es por `bootstrapApplication` en `main.ts`.

---

## 2. Arquitectura

```
src/
├── main.ts                     → bootstrapApplication(App, appConfig)
├── index.html                  → shell HTML + inyección de config runtime (window.__env)
├── styles.css                  → estilos globales
├── environments/               → (ver nota abajo: actualmente sin uso real)
└── app/
    ├── app.ts                  → componente raíz (shell: header/navbar/footer + router-outlet)
    ├── app.config.ts           → providers (router, HttpClient, interceptor)
    ├── app.routes.ts           → rutas con lazy loading y guards
    ├── components/             → UI compartida del shell
    │   ├── header/  navbar/  footer/
    ├── pages/                  → una carpeta por vista (lazy-loaded)
    │   ├── home/  about/  product-list/  product-detail/
    │   ├── cart/  checkout/  order-confirmation/
    │   ├── login/  register/  profile/  admin/
    ├── services/              → lógica y estado (inyectables singletons)
    │   ├── auth.service.ts        → sesión JWT, roles (signals)
    │   ├── backend.service.ts     → llamadas REST al Spring Boot
    │   ├── supabase.service.ts    → cliente Supabase compartido
    │   ├── product.service.ts     → catálogo + suscripción realtime
    │   └── cart.service.ts        → carrito persistido en localStorage
    ├── guards/
    │   └── auth.guard.ts          → authGuard, adminGuard
    ├── interceptors/
    │   └── auth.interceptor.ts    → inyecta Authorization: Bearer
    └── models/
        └── product.model.ts       → Product, CartItem
```

### Componente raíz (`app.ts`)
El shell renderiza `header` + `navbar` fijos arriba y `footer` abajo, con
`<router-outlet />` en medio. Usa un signal derivado de los eventos del router
(`toSignal` + `NavigationEnd`) para **ocultar el navbar en la página `/about`**.

---

## 3. Flujo de datos (arquitectura híbrida)

Este es el punto clave del diseño: **lecturas y escrituras van por caminos
distintos**.

```
                 ┌─────────────────── LECTURA catálogo (tiempo real) ───────────────┐
                 │                                                                   ▼
   [Angular] ──► ProductService ──► SupabaseService ──► Supabase (Postgres + Realtime)
       │                                                        ▲
       │                                                        │ (RLS: SELECT público,
       │                                                        │  escrituras bloqueadas)
       │
       └──► BackendService / AuthService ──► Spring Boot (Kaizer-Back) ──► Postgres
                 ▲                                                              │
                 └───────────── ESCRITURAS: checkout, crear producto, ─────────┘
                                perfil, pedidos, login/registro, DNI/RUC
```

- **Catálogo (lectura):** `ProductService` consulta la tabla `productos` de
  Supabase y **se suscribe a cambios** (`postgres_changes` sobre INSERT/UPDATE/
  DELETE). Cualquier cambio de stock o precio se refleja en la UI **sin recargar**.
- **Escrituras y lógica sensible:** login, registro, checkout, alta de productos,
  perfil, pedidos y consultas DNI/RUC pasan por el backend Spring Boot, que valida
  autorización, controla stock con bloqueo pesimista y firma los JWT.
- **Seguridad del modelo:** en Supabase, RLS permite `SELECT` público sobre
  `productos` pero bloquea insert/update/delete desde el cliente. Por eso el
  frontend puede leer con la *anon key* sin riesgo, mientras las mutaciones solo
  ocurren vía backend autenticado.

---

## 4. Configuración en runtime (`window.__env`)

La configuración **no** está compilada en el bundle. Se inyecta en `index.html`
mediante un bloque `<script>` que se ejecuta **antes** de cargar la app:

```html
<script>
  window.__env = {
    SUPABASE_URL:      'https://qyepmqkclniepsfsbrve.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOi...',   // clave pública (protegida por RLS)
    API_URL:           'https://kaizer-back-1.onrender.com'
  };
</script>
```

Los servicios lo leen con `(window as any).__env?.API_URL` (y `SUPABASE_URL`,
`SUPABASE_ANON_KEY`).

**Ventaja:** el mismo bundle compilado sirve para dev, staging y producción —
solo cambia el `index.html`. No hace falta recompilar para apuntar a otro backend.

> **Nota — código muerto:** `src/environments/environment.ts` y
> `environment.prod.ts` existen pero están **vacíos y no se importan en ningún
> lado**. La configuración real vive en `window.__env`. Conviene eliminarlos para
> evitar confusión, o migrar la config a ellos (habría que cambiar los servicios).

> **La `SUPABASE_ANON_KEY` es pública por diseño.** No es una fuga: Supabase la
> expone en el cliente y su acceso está limitado por Row Level Security.

---

## 5. Ruteo y guards (`app.routes.ts`)

Todas las páginas usan **lazy loading** (`loadComponent`), de modo que cada vista
es un chunk independiente que se descarga bajo demanda.

| Ruta | Componente | Protección |
|---|---|---|
| `/` | HomeComponent | pública |
| `/products` | ProductListComponent | pública |
| `/products/:id` | ProductDetailComponent | pública (input binding del `id`) |
| `/about` | AboutComponent | pública |
| `/cart` | CartComponent | pública |
| `/login` | LoginComponent | pública |
| `/register` | → redirige a `/login` | — |
| `/order-confirmation` | OrderConfirmationComponent | pública |
| `/checkout` | CheckoutComponent | **`authGuard`** |
| `/profile` | ProfileComponent | **`authGuard`** |
| `/admin` | AdminComponent | **`adminGuard`** |
| `**` | → redirige a `/` | — |

- **`authGuard`**: si no hay sesión → redirige a `/login`.
- **`adminGuard`**: exige sesión **y** rol `ADMIN`; sin sesión → `/login`, con
  sesión pero sin rol → `/products`.
- `withComponentInputBinding()` permite recibir parámetros de ruta (`:id`) como
  `@Input` directamente en el componente.

---

## 6. Gestión de estado con Signals

No se usa NgRx ni RxJS para estado global; todo es **Signals** dentro de servicios
singleton (`providedIn: 'root'`).

### `AuthService` — sesión y roles
- Signals: `token`, `userEmail`, `userNombre`, y derivados
  `isAuthenticated` (`computed`) e `isAdmin` (`computed`).
- El token se guarda en `localStorage` (`token`) y se **decodifica en el cliente**
  (`parseToken`) para extraer `sub` (email), `role` y `nombre` sin llamar al
  servidor.
- `login()` / `register()` llaman al backend, guardan el token y actualizan los
  signals. `logout()` limpia `localStorage` y resetea los signals.

### `CartService` — carrito
- Signal `cart` + `cartCount` (`computed`). Persistido en `localStorage` (`cart`).
- `addToCart` respeta el `stock` máximo (bloquea si se supera); `updateQuantity`
  hace *clamp* al stock; `removeAt` / `clearCart`.

### `ProductService` — catálogo reactivo
- Signals `products`, `loading`, `error`. Al construirse hace `refetch()` y abre
  el canal realtime; el signal `products` se actualiza en vivo ante cambios en BD.
- Mapea las filas snake_case de Postgres (`image_url`, `nombre`, …) al modelo
  camelCase `Product`.

> Al usar signals, las plantillas se actualizan automáticamente sin `async` pipe
> ni suscripciones manuales, y el change detection es más eficiente.

---

## 7. Autenticación (lado cliente)

1. `LoginComponent`/`RegisterComponent` → `AuthService.login()/register()` →
   `POST /api/auth/login|register` → recibe `{ token }`.
2. El token se guarda en `localStorage` y se decodifica para poblar los signals.
3. **`authInterceptor`** (interceptor funcional en `app.config.ts`) añade
   `Authorization: Bearer <token>` a **todas** las peticiones HTTP salientes si
   hay token guardado.
4. Los **guards** protegen las rutas; el **backend** revalida el JWT en cada
   request (la protección del cliente es solo de UX, la real está en el servidor).

---

## 8. Referencia de servicios

| Servicio | Responsabilidad | Depende de |
|---|---|---|
| `AuthService` | Sesión JWT, roles, login/registro/logout | `HttpClient` + `API_URL` |
| `BackendService` | REST: checkout, productos, perfil, pedidos, DNI/RUC, warm-up | `HttpClient` + `API_URL` |
| `SupabaseService` | Cliente Supabase compartido (persistSession, realtime) | `window.__env` |
| `ProductService` | Catálogo + suscripción realtime | `SupabaseService` |
| `CartService` | Carrito + persistencia local | `localStorage` |

Métodos destacados de `BackendService`:
`checkout()`, `createProducto()`, `getPerfil()`, `updateProfile()`,
`getMisPedidos()`, `getAdminPedidos()`, `patchEstadoPedido()`,
`lookupDocument()` (DNI de 8 dígitos → RENIEC; en otro caso → RUC/SUNAT),
`warmUp()` (ping silencioso a `/api/health` para despertar el backend gratuito de
Render y evitar el *cold start* en la primera compra).

---

## 9. Build y despliegue

### Build

```bash
npm run build          # ng build (configuración production por defecto)
```

- Salida: `dist/Kaizer-Front-Angular/` (artefacto **estático**: HTML, JS, CSS).
- `outputHashing: all` para cache-busting; budgets de tamaño configurados
  (warning 500 kB / error 1 MB para el bundle inicial).
- Resultado típico: ~85 kB inicial + chunks lazy por página.

### Despliegue (hosting estático)
Es una SPA estática; se puede servir en **Vercel, Netlify, Cloudflare Pages,
GitHub Pages, S3, Nginx**, etc. Pasos generales:

1. `npm run build`.
2. Publicar el contenido de `dist/Kaizer-Front-Angular/`.
3. **Configurar la config de runtime**: editar el bloque `window.__env` en el
   `index.html` desplegado para apuntar a la `API_URL` (backend de Render) y a tu
   proyecto de Supabase del entorno correspondiente.
4. **Fallback SPA (crítico):** redirigir todas las rutas a `index.html`, porque el
   ruteo es del lado cliente. Si no, recargar en `/products/5` daría 404.
   - **Vercel:** `vercel.json` con un rewrite `"/(.*)" → "/index.html"`.
   - **Netlify:** `_redirects` con `/*  /index.html  200`.
   - **Nginx:** `try_files $uri $uri/ /index.html;`.

> Actualmente esta carpeta **no** trae `vercel.json`/`netlify.toml`. Si se
> despliega en Vercel/Netlify hay que añadir el rewrite de SPA (puedo generarlo).

### CORS
El backend debe incluir el dominio del frontend en `CORS_ALLOWED_ORIGINS`
(soporta comodines como `https://*.vercel.app`). Si al desplegar aparecen errores
CORS en consola, revisa esa variable en Render.

---

## 10. Desarrollo local

```bash
npm install
npm start        # ng serve → http://localhost:4200
```

- Para desarrollo, el `window.__env` de `src/index.html` puede apuntar al backend
  local (`http://localhost:9090`) o al de Render.
- El backend ya permite `http://localhost:4200` en su CORS por defecto.

```bash
npm test         # Vitest (unit tests: app.spec.ts, etc.)
```

---

## 11. Recomendaciones / mejoras futuras

- **Eliminar `src/environments/*`** (código muerto) o migrar la config a ellos
  para tener tipado y evitar `(window as any)`.
- **Añadir `vercel.json`/`_redirects`** con el fallback SPA antes de desplegar.
- **Tipar `window.__env`**: crear un `env.d.ts` con la interfaz global para quitar
  los `as any` en los servicios.
- **Manejo de expiración de token:** hoy el token de 24 h se decodifica en cliente
  pero no hay refresco; conviene detectar `401` en un interceptor de errores y
  forzar logout/redirect a `/login`.
- **Estado de carga/errores global:** un interceptor o servicio de notificaciones
  para respuestas de error del backend (ej. stock insuficiente ya se maneja, pero
  podría centralizarse).
- **Tests e2e** (Playwright/Cypress) para los flujos críticos: login → carrito →
  checkout.
- **Accesibilidad y SEO:** al ser SPA, evaluar SSR/prerender con Angular Universal
  si el posicionamiento importa.
