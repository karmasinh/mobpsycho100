# se debe colocar esto al inicio 

# -- Elimina la columna vieja «fecha» que quedó de versión anterior  -- solo si les sale error al iniciar


ALTER TABLE auditoria_log DROP COLUMN IF EXISTS fecha;


-- Verificar que la estructura quedó bien
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auditoria_log'
ORDER BY ordinal_position;


# Sistema Integral Restaurante/Pensión — Frontends Angular

## Estructura del proyecto

frontend/
├── cocina/          ← Sistema de Cocina (puerto 4200)
└── ventas/          ← Sistema de Ventas (puerto 4201)
###



##  Sistema de Cocina

**Puerto:** `http://localhost:4200`
**Roles con acceso:** `COCINERO`, `JEFE_COCINA`, `ALMACENERO`, `ADMIN`

### Temas PRINCIPALES
| Tema    | Descripción                     | Modo  |
|---------|---------------------------------|-------|
| 🔥 Fuego  | Industrial oscuro — carbón y llama | Dark  |
| 🌅 Brasa  | Ámbar cálido — cocina profesional  | Dark  |
| 🧊 Hielo  | Cyan limpio — modo claro          | Light |
| ✨ Vapor  | Violeta neón — nocturno premium   | Dark  |

### Pantallas
- **Dashboard** — estadísticas de pedidos, stock bajo, vencimientos
- **Cola de pedidos** — Kanban en tiempo real (auto-refresco 15s)
- **Inventario** — ingresos FEFO, consumos, ajustes
- **Platos y recetas** — menú del restaurante

---

##  Sistema de Ventas

**Puerto:** `http://localhost:4201` 
## El puerto dependera de cual inicien primero

**Roles con acceso:** `CAJERO`, `VENDEDOR`, `GERENTE_SUCURSAL`, `ADMIN`

### Temas disponibles
| Tema       | Descripción                        | Modo  |
|------------|------------------------------------|-------|
| 💚 Esmeralda | Verde elegante — fresco y natural  | Light |
| 🔷 Cielo    | Azul profesional — claro y serio   | Light |
| 🌙 Noche    | Índigo nocturno — moderno y oscuro | Dark  |
| 🌸 Rosa     | Cálido y acogedor — pensión familiar| Light |

### Pantallas
- **Dashboard** — ventas del día, pensionados, cobros pendientes
- **Caja** — punto de venta con carrito, formas de pago, vuelto
- **Clientes** — estado (ACTIVO, INACTIVO, RECUPERADO, etc.) -- con errores aun
- **Pensionados** — registro, asistencia, cobros mensuales
- **Cobros** — pendientes, historial, pagos parciales

---

##  Instalación y ejecución

### Prerrequisitos
- Node.js >= 18.x  -- pero tranqui da con el que tienen creo  --  node v 
- Angular CLI `npm install -g @angular/cli`
- Backend Spring Boot corriendo en `localhost:8080`

### Sistema Cocina
```bash
cd frontend/cocina
npm install
ng serve
# Abre: http://localhost:4200
```

### Sistema Ventas
```bash
cd frontend/ventas
npm install
ng serve --port 4201
# Abre: http://localhost:4201
```

---

##  Credenciales iniciales

El backend crea el usuario **admin** al iniciar por primera vez:
- **Usuario:** `admin`
- **Contraseña:** `Admin123!`

> ⚠️ Cambia la contraseña inmediatamente en producción.

---

## 🎨 Cómo funciona el sistema de temas

### Arquitectura
Los temas se implementan con **CSS Custom Properties (variables CSS)** + clases en el `<html>`.

```css
/* Cada tema define las mismas variables con distintos colores */
.theme-fuego {
  --color-primary:    220 60 30;
  --color-surface:    20 18 16;
  ...
}
.theme-hielo {
  --color-primary:    14 116 144;
  --color-surface:    248 250 252;
  ...
}
```

Tailwind usa estas variables:
```js
colors: {
  primary: 'rgb(var(--color-primary) / <alpha-value>)',
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  ...
}
```

### ThemeService
```typescript
// Cambiar tema en cualquier componente
themeService.setTheme('vapor');

// Tema reactivo con signal
themeService.currentTheme() // → 'fuego' | 'brasa' | 'hielo' | 'vapor'
```

El tema se guarda en `localStorage` y se restaura al recargar.

---

## 🔒 Seguridad implementada

| Característica | Detalle |
|---|---|
| JWT Bearer | Agregado automáticamente por el interceptor |
| Bloqueo automático | Tras 3 intentos fallidos → HTTP 423 |
| Guard por módulo | `data: { modulo: 'MOD_CAJA' }` en las rutas |
| Separación de sistemas | Login verifica que el usuario sea del sistema correcto |
| Login doble | Cada app valida `sistema === 'COCINA'` o `sistema === 'VENTAS'` |   --- viendolo recien jajaja intentando

---

##  Conexión con el backend

Edita `src/environments/environment.ts` en cada app:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',  // ← Cambiar en producción  si solo si lo suben a  produccion 
};
```

---

## 🗂️ Estructura de archivos por app

```
src/app/
├── core/
│   ├── guards/        auth.guard.ts
│   ├── interceptors/  jwt.interceptor.ts
│   ├── models/        index.ts (todos los tipos)
│   └── services/
│       ├── auth.service.ts
│       ├── theme.service.ts  --temas del sistema
│       └── api.service.ts
├── features/
│   ├── auth/          login.component.ts
│   ├── dashboard/     dashboard.component.ts
│   ├── pedidos/       cola-pedidos.component.ts
│   ├── caja/          caja.component.ts
│   └── pensionados/   pensionados.component.ts
├── layout/
│   └── shell.component.ts   (sidebar + topbar)
└── shared/
    └── components/    sin-acceso.component.ts

    styles.css    --estilos globales del sistema aqui pueden agregar mas temas de pantalla  tambien  agregar en themes y index.ts  final 
```
