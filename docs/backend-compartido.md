# Estado del backend compartido

## Propósito y evidencia

Este documento describe el backend que atiende a los frontends Cocina y Ventas. La revisión se realizó sobre `SistemaDesk/SistemaDesk/restaurante`, sus controladores, servicios, entidades, rutas consumidoras y pruebas existentes. El estado es una revisión estática del código combinada con ejecución real de la suite de pruebas (`mvn test`, ver sección Verificación).

## Unidad del proyecto

El código no se divide por proyecto académico: existe una sola API, una sola base PostgreSQL y entidades relacionadas que son consumidas por los dos frontends. La separación de Luciana y Alison se aplica únicamente a la documentación de alcance, casos de uso y estado de cada consumidor.

## Arquitectura verificada

Spring Boot 3.2.5 con Java 17, Spring Web, JPA, Security, Validation y WebSocket/STOMP. La persistencia usa PostgreSQL y JWT protege la API. El flujo principal es:

```text
Angular Cocina/Ventas (web :4200/:4201, o app móvil Capacitor) → HttpClient + Bearer JWT → Controller
→ Service → Repository/JPA → PostgreSQL
                                   └→ evento STOMP para pedidos
```

Entrada principal: `src/main/java/com/restaurante/controller`. La lógica está en `service/impl`, el acceso en `repository`, el dominio en `entity` y los contratos en `dto`. Autorización combina roles fijos (`hasRole`/`hasAnyRole`) con permisos dinámicos por módulo (`@perm.tiene(authentication, 'MOD_X')`, resuelto por `PermisoEvaluator` contra `UserDetailsImpl.getModulos()` reconstruido en cada request desde la base — el JWT solo lleva el claim `modulos` de forma informativa para el menú del frontend).

## Cobertura por dominio

| Dominio | Controladores y capacidades | Estado |
|---|---|---|
| Seguridad y administración | `Auth`, `Empleado`, `Rol`, `ModuloMenu`, `Sucursal`, `Auditoria`, `Alerta` | IMPLEMENTADO |
| Cocina | `CategoriaInsumo`, `Insumo`, `Inventario`, `Plato`, `Receta`, `Produccion`, `Pedido` | IMPLEMENTADO |
| Ventas | `Cliente`, `Pedido`, `Venta`, `CierreCaja`, `SolicitudAprobacion` | IMPLEMENTADO |
| Pensionados | `Pensionado`, `TipoAlmuerzoPensionados` | IMPLEMENTADO |
| Compartido | `Proveedor`, disponibilidad de producción, WebSocket y tareas programadas | IMPLEMENTADO |

No se encontró un módulo principal del frontend sin controlador correspondiente. Ver "Pendientes" al final para las brechas puntuales que sí siguen abiertas.

## Flujos implementados

- Login devuelve JWT, sistema (`COCINA`, `VENTAS`, `ADMIN`), roles, módulos y contexto de usuario.
- Cocina registra lotes, stock, mermas, recetas y producción; la producción consume insumos por FEFO con conversión de unidades unificada (`UnidadConversionService` contra el catálogo real `UnidadMedida`, ya no una lista hardcodeada separada).
- Ventas crea pedidos, cobra (exige turno de caja abierto), gestiona caja, pensionados, asistencia y reportes/dashboards por rol.
- **Flujo de solicitud → aprobación**: anulación de venta y reversión de movimiento de caja por roles no-ADMIN pasan por `SolicitudAprobacionController` (solicitar/aprobar/rechazar) en vez de ejecutarse directo; `ADMIN` sigue pudiendo anular/revertir directo.
- Los pedidos publican eventos STOMP y la disponibilidad producida se comparte entre ambos frontends.
- Schedulers generan cobros mensuales, bajas automáticas de pensionados, alertas de inventario y degradación de fidelidad de clientes.

## App móvil (Android, Capacitor)

Ambos frontends se empaquetan también como app Android nativa vía Capacitor (`Fronten/Ventas/android/`, `Fronten/Cocina/android/`), sin librería de componentes Ionic — reutilizan el mismo sistema de diseño web (Tailwind + tokens CSS). Sesión migrada a `@capacitor/preferences` con cache en memoria para uso síncrono en el interceptor HTTP. Probado en emulador Android (`Medium_Phone_API_36.0`) con `adb reverse tcp:8080 tcp:8080` para alcanzar el backend local; en dispositivo físico se usa la misma técnica o la IP LAN configurada en `environment.mobile.ts`.

## Información recuperada de la documentación que acompaña al software

`docs/DOCUMENTACION.md` registra cinco fases funcionales que deben conservarse como contexto histórico:

1. **Fase 1:** multisucursal, receta→insumo, cobro automático de pensionados y disponibilidad producida.
2. **Fase 2:** cierre de caja por turno y tiempo real Cocina↔Ventas mediante WebSocket/STOMP.
3. **Fase 3:** costo promedio ponderado, rentabilidad por plato y comparativo entre sucursales.
4. **Fase 4:** datos semilla, ingresos/retiros de caja, comanda impresa, notificación en Cocina e inventario por sucursal.
5. **Fase 5:** permisos dinámicos reales por módulo y pruebas unitarias de servicios.

Fases posteriores no documentadas en `DOCUMENTACION.md` (agregadas directamente en este documento y en los backlogs de cada proyecto): app móvil Capacitor, migración de íconos a Iconify, flujo de solicitud/aprobación de reversiones, dashboards BI por rol, matriz de permisos con pruebas reales (`PermisoMatrizTest`), primera batería de pruebas de frontend (Jasmine/Karma) en ambos proyectos.

## Divergencias ya resueltas (constaban como abiertas en la revisión de 2026-09-09)

- ~~La documentación histórica contempla una aplicación móvil Android, pero no existe un frontend móvil~~ → **Resuelto**: app móvil Capacitor implementada y probada en emulador para ambos proyectos.
- La tabla histórica de puertos en `DOCUMENTACION.md` sigue invertida respecto a los `package.json` actuales: Cocina usa 4200 y Ventas 4201 (no corregida en el documento histórico, se deja como nota permanente).
- Gemini se sigue invocando desde el frontend con una clave de entorno; no se trasladó al backend en este período — sigue como pendiente (ver más abajo).
- ~~El cierre de caja no bloquea ventas sin turno abierto~~ → **Resuelto**: `VentaServiceImpl.cobrar` ahora exige un turno `ABIERTO` en la sucursal del pedido antes de crear la `Venta` (decisión de negocio documentada en `Alison Docs/documentacion/borrador/10_BACKLOG_Y_CAMBIOS.md`).

## Pendientes prioritarios (revisados 2026-09-11)

| Prioridad | Estado anterior | Estado actual |
|---|---|---|
| Producción permitía escenarios sin restricción de receta/cantidad | Crítica | **Resuelto**: `ProduccionServiceImpl` valida receta activa y `cantidadProducida <= cantidadPlanificada`, con conversión de unidades correcta antes de descontar insumos. |
| `VentaServiceImpl` no exigía turno abierto | Alta | **Resuelto** (ver arriba). |
| Inicializadores de datos podían duplicar responsabilidades | Alta | **Resuelto**: `@Order` explícito agregado a `InventarioSucursalBackfillRunner`/`VentaSucursalBackfillRunner`, después de `DataInitializer`/`DatosPruebaRunner`. |
| Catálogo de unidades duplicado (`UnidadConversionService` vs. `DataInitializer`) | Media | **Resuelto**: `UnidadConversionService` consulta `UnidadMedidaRepository`, ya no mantiene una lista `ALIAS` propia (5 tests en `UnidadConversionServiceTest`). |
| Normalización de campos opcionales únicos (`Cliente`/`Pensionado` `telefono`/`correo`) | — | **Resuelto** (AUD-A-030, AUD-A-031): `""` se normaliza a `null` antes de validar duplicados y persistir, en ambos controllers/servicios. |
| Pruebas cubrían servicios, no todos los contratos HTTP | Alta | **Parcialmente resuelto**: se agregaron `CategoriaPlatoControllerSecurityTest` (primer `@WebMvcTest` del proyecto, ejercita `@PreAuthorize` real), `ClienteControllerTest`, `TipoAlmuerzoPensionadosControllerTest`, `PermisoMatrizTest` (274 casos rol×módulo). Sigue faltando cobertura `@WebMvcTest` para la mayoría de los ~24 controllers restantes. |
| Alertas y auditoría no uniformemente limitadas por sucursal | Alta | **Resuelto** (AUD-A-028): `AuditoriaLog` tiene `sucursal_id` poblado en los puntos de escritura relevantes; `listar()`/`porEntidad()`/`porUsuario()` filtran vía `SucursalAccessService`. |
| Rutas de `PedidoController` con autorización débil (`isAuthenticated()` desnudo) | Crítica | **Sin verificar en este período** — no se auditó puntualmente en las últimas rondas; revisar antes de cerrar. |
| Gemini invocado desde frontend con clave de entorno expuesta | — | **Sigue abierto** — no se trasladó al backend. |

## Verificación

Desde `SistemaDesk/SistemaDesk/restaurante`: `mvn test` para pruebas existentes y `mvn clean verify` como compuerta completa.

**Verificación realizada el 2026-09-11:** `mvn test` terminó con **378 pruebas ejecutadas, 0 fallos, 0 errores** y `BUILD SUCCESS` (frente a las 20 pruebas registradas en la revisión de 2026-09-09 — el salto se explica por la matriz de permisos, las pruebas de solicitud de aprobación, venta, cierre de caja, producción, conversión de unidades y los controllers nuevos). Esto sigue sin cubrir todos los contratos HTTP (ver tabla de pendientes) ni una auditoría de concurrencia exhaustiva.
