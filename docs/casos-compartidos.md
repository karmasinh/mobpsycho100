# Casos compartidos del core

## Propósito

El código permanece en un único proyecto: `SistemaDesk/SistemaDesk`. El backend Spring Boot, PostgreSQL, autenticación, RBAC, sucursales, auditoría y eventos compartidos sirven a los dos frontends. Este documento define los casos que no deben duplicarse en Luciana ni Alison; cada proyecto los referencia desde sus casos propios.

## Actores compartidos

| ID | Actor | Responsabilidad |
|---|---|---|
| ACT-C-001 | Administrador | Gestionar usuarios, roles, módulos, sucursales y configuración global. |
| ACT-C-002 | Usuario autenticado | Consumir únicamente módulos permitidos por rol/RBAC y sucursal efectiva. |
| ACT-C-003 | Scheduler del backend | Ejecutar alertas, estados de clientes/pensionados y cobros automáticos. |
| ACT-C-004 | Servicio WebSocket/STOMP | Publicar y recibir eventos de pedidos por sucursal. |

## Catálogo del core

| ID | Caso compartido | Evidencia | Estado |
|---|---|---|---|
| CU-C-001 | Autenticar usuario y resolver sistema | `AuthController`, JWT, `AuthService`, guards Angular | IMPLEMENTADO_CON_BRECHA |
| CU-C-002 | Aplicar RBAC y permisos dinámicos por módulo | `SecurityConfig`, `@PreAuthorize`, `PermisoEvaluator`, `ModuloMenu` | IMPLEMENTADO_CON_BRECHA |
| CU-C-003 | Resolver sucursal efectiva y aislar datos | `Empleado.sucursal`, servicios de acceso y filtros | IMPLEMENTADO_CON_BRECHA |
| CU-C-004 | Administrar usuarios, roles, módulos y sucursales | `EmpleadoController`, `RolController`, `ModuloMenuController`, `SucursalController` | IMPLEMENTADO |
| CU-C-005 | Publicar y consumir eventos de pedidos | `WebSocketConfig`, `WebSocketAuthInterceptor`, `RealtimeService` | IMPLEMENTADO_CON_BRECHA |
| CU-C-006 | Generar, consultar y auditar alertas | `AlertaController`, `AuditoriaController`, schedulers | IMPLEMENTADO_CON_BRECHA |
| CU-C-007 | Compartir catálogo y disponibilidad entre frontends | `Plato`, `Produccion`, `Pedido`, API REST | IMPLEMENTADO_CON_BRECHA |

## Regla de separación

- Luciana documenta sus casos `CU-L-*` y referencia `CU-C-*` cuando usa el core.
- Alison documenta sus casos `CU-A-*` y referencia `CU-C-*` cuando usa el core.
- No se debe crear una segunda implementación del backend para cada proyecto.
- Un caso se considera cumplido sólo cuando backend, frontend consumidor, permisos, sucursal, pruebas y evidencia coinciden.

## Orden de implementación

1. Corregir `CU-C-001` a `CU-C-003` en backend y pruebas de seguridad.
2. Completar los casos de negocio backend de cada proyecto.
3. Verificar las rutas y pantallas del frontend Cocina.
4. Verificar las rutas y pantallas del frontend Ventas.
5. Actualizar documentación, UML y LaTeX después de cerrar la evidencia.
