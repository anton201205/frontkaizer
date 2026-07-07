# Kaizer-Front-Angular

**Frontend SPA** del e-commerce **Kaizer Tech**. Catálogo con actualización en tiempo real, carrito, checkout, autenticación JWT, perfil de usuario y panel de administración.

## 📌 Stack tecnológico

- **Framework:** Angular 22 (standalone, sin NgModules)
- **Lenguaje:** TypeScript ~6.0
- **Estado:** Angular Signals (nativo, sin NgRx)
- **Build:** `@angular/build:application` (esbuild/Vite)
- **Base de datos:** Supabase (PostgreSQL + Realtime)
- **HTTP:** HttpClient + interceptores
- **Tests:** Vitest + jsdom
- **Despliegue:** Vercel / Netlify (SPA estática)

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/AndreeQuispe12/Kaizer-Front-Angular.git
cd Kaizer-Front-Angular

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver .env.example)
# Edita src/index.html y actualiza window.__env con tus valores:
# - API_URL (backend Spring Boot)
# - SUPABASE_URL (base de datos)
# - SUPABASE_ANON_KEY (cliente Supabase)
```

### Desarrollo local

```bash
# Iniciar servidor local (puerto 4200)
npm start

# Abrir http://localhost:4200 en el navegador
# La app se recarga automáticamente al guardar cambios
```

### Build para producción

```bash
# Compilar
npm run build

# Servir localmente la build de producción
npm run serve
```

> ⚠️ **Importante (Angular 22):** el builder `@angular/build:application` genera
> el output dentro de una **subcarpeta `browser/`**:
> `dist/Kaizer-Front-Angular/browser/`. El `index.html` y los assets están ahí,
> **no** en `dist/Kaizer-Front-Angular/` directamente. Por eso el `outputDirectory`
> de Vercel debe apuntar a `dist/Kaizer-Front-Angular/browser` (ver sección Despliegue).

### Tests

```bash
# Ejecutar tests unitarios
npm test

# Ejecutar tests con cobertura
npm test -- --coverage
```

## 📂 Estructura del proyecto

```
src/
├── main.ts                    → Punto de entrada (bootstrapApplication)
├── index.html                 → Shell HTML + window.__env (configuración runtime)
├── styles.css                 → Estilos globales
└── app/
    ├── app.ts                 → Componente raíz (shell)
    ├── app.config.ts          → Providers (router, HttpClient, interceptor)
    ├── app.routes.ts          → Rutas con lazy loading y guards
    ├── components/            → UI compartida (header, navbar, footer)
    ├── pages/                 → Vistas lazy-loaded (home, products, cart, checkout, etc.)
    ├── services/              → Lógica + estado con Signals
    │   ├── auth.service.ts    → Sesión JWT y roles
    │   ├── backend.service.ts → Llamadas REST al backend
    │   ├── supabase.service.ts → Cliente Supabase
    │   ├── product.service.ts → Catálogo con realtime
    │   └── cart.service.ts    → Carrito persistido en localStorage
    ├── guards/                → authGuard, adminGuard
    ├── interceptors/          → auth.interceptor (inyecta token JWT)
    └── models/                → Interfaces y tipos
```

## 🔐 Autenticación

- **JWT stateless** — Token guardado en localStorage
- **Decodificación en cliente** — Extrae email, rol y nombre sin llamar al servidor
- **Interceptor automático** — Inyecta `Authorization: Bearer <token>` en todas las peticiones
- **Guards de ruta** — `authGuard` (usuario autenticado), `adminGuard` (solo ADMIN)

**Flujo de registro:**
1. Usuario ingresa: Nombre, Apellidos, Email, Contraseña (sin DNI)
2. Click "Crear cuenta" → POST `/api/auth/register`
3. Backend valida y crea usuario
4. Token se guarda en localStorage
5. Usuario redirigido a home

**Flujo de login:**
1. Usuario ingresa Email y Contraseña
2. Click "Ingresar" → POST `/api/auth/login`
3. Backend valida credenciales
4. Token se guarda en localStorage
5. Interceptor lo añade automáticamente a peticiones futuras
6. Guards protegen rutas (`/checkout`, `/profile`, `/admin`)

**Nota sobre DNI/RUC:**
El DNI/RUC se solicita **en el checkout** (no en registro) para autocompletar nombre/razón social con Decolecta (RENIEC/SUNAT).

## 🗂️ Variables de entorno

Edita `src/index.html` en el bloque `<script>` (antes de `<app-root>`):

```html
<script>
  window.__env = {
    API_URL: 'https://kaizer-back-1.onrender.com',           // Backend (Render)
    SUPABASE_URL: 'https://xxx.supabase.co',                 // Base de datos
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Clave pública
  };
</script>
```

**Desarrollo local:**
```html
<script>
  window.__env = {
    API_URL: 'http://localhost:9090',           // Backend local
    SUPABASE_URL: 'http://localhost:54321',     // Supabase local (opcional)
    SUPABASE_ANON_KEY: '...'
  };
</script>
```

Ver `.env.example` para referencia completa.

## 🚀 Despliegue

### Vercel (recomendado)

Desplegado en producción: `https://kaizer-front-angular.vercel.app`

1. Push a GitHub
2. Conecta tu repo en [vercel.com](https://vercel.com)
3. Vercel detecta `vercel.json` automáticamente
4. Deploy → se compila y publica
5. Edita `index.html` en la interfaz de Vercel o redeploy después de cambiar `window.__env`

El `vercel.json` de este repo:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/Kaizer-Front-Angular/browser",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> ⚠️ **Clave del despliegue:** el `outputDirectory` **debe** terminar en
> `/browser`, porque Angular 22 emite ahí el `index.html`. Apuntar a
> `dist/Kaizer-Front-Angular` (sin `/browser`) produce un **404 NOT_FOUND** de
> Vercel, ya que no encuentra el `index.html`.
>
> Si usas **Root Directory** en Vercel (repo con varios proyectos), déjalo como el
> nombre de la carpeta del frontend (ej. `Kaizer-Front-Angular`). Si el repo ya
> **es** el frontend, déjalo **vacío**.

### Netlify

1. Push a GitHub
2. Conecta tu repo en [netlify.com](https://netlify.com)
3. Netlify detecta `netlify.toml` automáticamente
4. Deploy → se compila y publica
5. Edita `index.html` en la interfaz de Netlify o redeploy

> El `publish` de `netlify.toml` también debe apuntar a
> `dist/Kaizer-Front-Angular/browser` por la misma razón.

### Configuración importante

Asegúrate de que:
- El **`outputDirectory` / `publish` apunta a `dist/Kaizer-Front-Angular/browser`**
  (subcarpeta que genera Angular 22)
- El **fallback SPA** está configurado (redirige todas las rutas a `index.html`)
  - Vercel: `vercel.json` ✓
  - Netlify: `netlify.toml` ✓
- El **backend incluye tu dominio en CORS**
  - Variable `CORS_ALLOWED_ORIGINS` en Render debe incluir tu URL de Vercel/Netlify

## 🔗 Endpoints consumidos

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/auth/register` | POST | Público | Registro de usuario |
| `/api/auth/login` | POST | Público | Login |
| `/api/productos` | GET | Público | Lista de productos (desde Supabase realtime) |
| `/api/checkout` | POST | Autenticado | Crear pedido |
| `/api/usuarios/perfil` | GET/PUT | Autenticado | Perfil del usuario |
| `/api/pedidos/mis-pedidos` | GET | Autenticado | Pedidos del usuario |
| `/api/pedidos/admin/**` | GET/PATCH | ADMIN | Gestión de pedidos |
| `/api/consulta/dni/{dni}` | GET | Público | Consulta RENIEC (Decolecta) |

Ver `DOCUMENTACION_FRONTEND.docx` para referencia completa.

## 📖 Documentación

- **DOCUMENTACION_FRONTEND.docx** — Guía técnica completa (arquitectura, flujos, despliegue)
- **DOCUMENTACION_BACKEND.docx** — Documentación del backend (ver repo de Kaizer-Back)

## 🛠️ Tecnologías destacadas

### Signals (Angular 22)
Estado reactivo sin NgRx. Los servicios exponen signals que se actualizan automáticamente en las plantillas:

```typescript
export class AuthService {
  private _token = signal<string | null>(null);
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this._token()));
}
```

### Realtime (Supabase)
El catálogo se actualiza en vivo cuando hay cambios en la BD:

```typescript
// Suscripción automática a cambios en la tabla 'productos'
this.supabase.client
  .channel('realtime-productos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, (payload) => {
    // Actualiza el signal this._products
  })
  .subscribe();
```

### Lazy Loading
Cada página es un chunk independiente descargado bajo demanda:

```typescript
{
  path: 'products',
  loadComponent: () => import('./pages/product-list/product-list.component').then(m => m.ProductListComponent)
}
```

## 🤝 Contribuir

1. Fork el repo
2. Crea una rama (`git checkout -b feature/tu-feature`)
3. Commit cambios (`git commit -m 'Add tu-feature'`)
4. Push a la rama (`git push origin feature/tu-feature`)
5. Abre un Pull Request

## 📝 Licencia

Sin licencia especificada. Puedes usar y modificar libremente.

## 📧 Contacto

- **Email:** andreequispe96@gmail.com
- **GitHub:** [AndreeQuispe12](https://github.com/AndreeQuispe12)

---

**Última actualización:** Julio 2026  
**Versión:** 1.0.0
