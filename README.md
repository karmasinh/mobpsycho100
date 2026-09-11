# SistemaDesk — Sistema Integral Restaurante/Pensión "La Entrerriana"

Sistema de gestión para un restaurante con servicio de pensión (almuerzos mensuales): backend compartido en Spring Boot y dos frontends Angular independientes, uno para el área de Ventas/Caja y otro para Cocina/Inventario, ambos también empaquetados como apps móviles Android con Capacitor.

## Estructura del repositorio

```
restaurante/          Backend Spring Boot 3.2.5 (Java 17) — API REST + WebSocket, puerto 8080, context-path /api
Fronten/Ventas/        Frontend Angular 17 (standalone + signals) — caja, clientes, pensionados, reportes. Puerto 4201.
Fronten/Cocina/         Frontend Angular 17 (standalone + signals) — producción, inventario, recetas, kárdex. Puerto 4200.
docs/                  Documentación técnica de referencia del backend compartido (fases, casos de uso comunes)
```

Cada frontend también se compila como app Android nativa con [Capacitor](https://capacitorjs.com/) (carpetas `android/` dentro de cada proyecto), sin librería de componentes Ionic — reutilizan el mismo sistema de diseño (Tailwind + tokens CSS) que la versión web.

Las especificaciones funcionales detalladas (casos de uso, requisitos, auditoría) viven fuera de este repositorio, en `Alison Docs/` (dominio Ventas) y `Luciana Docs/` (dominio Cocina).

## Arquitectura y conceptos clave

- **Multisucursal**: un empleado con sucursal fija opera siempre sobre esa sucursal en el backend, sin importar lo que envíe el cliente. Los usuarios sin sucursal fija (típicamente `ADMIN`) pueden elegir sucursal activa.
- **Autenticación y permisos**: JWT (`JwtAuthenticationFilter`) + 7 roles fijos (`ADMIN`, `GERENTE_SUCURSAL`, `CAJERO`, `VENDEDOR`, `COCINERO`, `JEFE_COCINA`, `ALMACENERO`) con permisos dinámicos adicionales por módulo (`PermisoEvaluator`). El login indica a qué sistema pertenece el usuario (`VENTAS`/`COCINA`/`ADMIN`); cada frontend rechaza logins de otro sistema.
- **Tiempo real**: STOMP sobre `ws://localhost:8080/api/ws` para la cola de pedidos entre Ventas y Cocina, con polling de respaldo.
- **Flujo principal**: Cocina define receta → planifica producción → registra lo producido (descuenta insumos por FEFO) → Ventas vende contra la producción del día → cobra → actualiza fidelización del cliente.
- **Inventario por sucursal**: catálogo de insumos global, pero stock/lotes/movimientos son por sucursal; el costo es un promedio ponderado global.
- **Flujo de aprobación**: anulaciones de venta y reversiones de caja fuera del rol `ADMIN` pasan por una solicitud que un administrador aprueba o rechaza.

## Requisitos previos

- Java 17 (backend) — para compilar los APK móviles con Capacitor se necesita **JDK 21** además.
- Node.js 18+ y npm (frontends).
- PostgreSQL 14+ con una base de datos `taller3`.
- Android Studio / SDK (solo si se va a compilar o probar la app móvil).

## Cómo correr el proyecto

### Backend

```bash
cd restaurante
mvn spring-boot:run       # API en http://localhost:8080/api
mvn clean verify          # compila y corre toda la suite de tests
```

Configura `restaurante/src/main/resources/application.properties` con tus propias credenciales locales de PostgreSQL (`spring.datasource.username`/`password`) — **no subas credenciales reales a este archivo**. Al arrancar contra una base vacía, `DataInitializer`/`DatosPruebaRunner` siembran el catálogo base y un usuario `admin` / `admin123`.

### Frontend Ventas

```bash
cd Fronten/Ventas
npm install
npm start                 # http://localhost:4201
npm test                  # pruebas Jasmine/Karma
npm run build:prod
```

### Frontend Cocina

```bash
cd Fronten/Cocina
npm install
npm start                 # http://localhost:4200
npm test
npm run build:prod
```

### Apps móviles (Android)

Desde cada proyecto de `Fronten/`:

```bash
npm run build:mobile
npx cap sync android
cd android && ./gradlew assembleDebug   # requiere JDK 21
```

El APK resultante apunta por defecto a `http://localhost:8080/api`; en un dispositivo o emulador real usa `adb reverse tcp:8080 tcp:8080` para que ese `localhost` llegue al backend corriendo en tu máquina.

## Pruebas

- Backend: JUnit 5 + Mockito + `spring-security-test` (`mvn clean verify`).
- Frontend: Jasmine/Karma (`npm test` en cada proyecto de `Fronten/`).

## Documentación adicional

- [`docs/README.md`](docs/README.md): índice de la documentación técnica del backend compartido.
- `Alison Docs/` y `Luciana Docs/` (fuera de este repositorio): especificación funcional completa por dominio — casos de uso, requisitos, auditoría, capturas de pantalla y flujos de navegación por rol.
