# Sistema La Entrerriana — Documentación funcional

> Última actualización: Fase 5 completada (permisos dinámicos reales por módulo + tests automatizados), sobre la base de la Fase 4 (datos semilla, retiros/ingresos de caja, comanda impresa + notificación en cocina, inventario de insumos por sucursal), la Fase 3 (costo promedio ponderado, rentabilidad real por plato, comparativo por sucursal), la Fase 2 (cierre de caja por turno + tiempo real cocina↔ventas vía WebSocket) y la Fase 1 (multisucursal real, integración receta↔insumo, cobro automático de pensionados).

## 1. Visión general

Sistema de gestión para un restaurante/pensión con **múltiples sucursales**, compuesto por un backend único y dos frontends independientes que hablan con la misma API:

| Componente | Tecnología | Puerto (dev) | Para quién |
|---|---|---|---|
| `restaurante/` | Spring Boot 3 + PostgreSQL + JWT | 8080 | API única para ambos frontends |
| `frontend/ventas/` | Angular 17 (standalone + signals) | 4200* | Cajeros, vendedores, administración de pensionados, gerencia |
| `frontend/cocina/` | Angular 17 (standalone + signals) | 4201* | Cocineros, jefe de cocina, almacén |

\* Los `package.json` de cada proyecto tienen los scripts `start` con los puertos invertidos respecto a esta tabla — es una inconsistencia preexistente en el repo, verificar `angular.json` de cada proyecto antes de asumir el puerto.

Un mismo usuario inicia sesión con el mismo endpoint (`POST /auth/login`); el backend le informa a qué **sistema** pertenece (`COCINA`, `VENTAS` o `ADMIN`) según su rol, y cada frontend rechaza el login si el usuario no pertenece a su sistema (o a `ADMIN`, que entra a ambos).

## 2. Actores (roles)

Los roles son dinámicos (tabla `roles` + `modulos_menu`), pero el código tiene estos nombres de rol "conocidos" hardcodeados en las reglas de autorización (`SecurityConfig` + `@PreAuthorize`):

| Rol | Sistema | Puede |
|---|---|---|
| `ADMIN` | Ambos | Todo — gestión de roles, módulos, usuarios, empleados, auditoría, sucursales |
| `GERENTE_SUCURSAL` | Ventas (principalmente reportes) | Ver/anular ventas, ver reportes, gestionar empleados de su sucursal |
| `CAJERO` / `VENDEDOR` | Ventas | Crear pedidos, cobrar, gestionar pensionados y clientes |
| `COCINERO` / `JEFE_COCINA` | Cocina | Producción diaria, recetas, cambiar estado de pedidos, inventario |
| `ALMACENERO` | Cocina | Inventario, insumos, proveedores (sin producción) |
| `PENSIONADO` | — | Rol creado automáticamente al registrar un pensionado (sin endpoints propios habilitados todavía) |

Cada `Usuario` puede estar ligado a un `Empleado` (que a su vez tiene una `Sucursal` fija) o a un `Pensionado`. Un `Usuario` **sin** `Empleado.sucursal` (típicamente `ADMIN`) opera en modo "multi-sucursal" y debe elegir la sucursal activa desde el selector del topbar.

## 3. Módulo Ventas / Caja (`frontend/ventas`)

| Caso de uso | Cómo se hace | Endpoint(s) | Estado |
|---|---|---|---|
| Tomar un pedido en caja | Pantalla **Caja**: elegir platos (o armar un almuerzo eligiendo sopa+segundo entre lo producido hoy), agregar cliente opcional | `POST /pedidos` | ✅ |
| Cobrar el pedido | Elegir forma de pago (efectivo/QR/mixto/crédito de cuenta), registrar monto recibido | `POST /ventas/cobrar/{pedidoId}` | ✅ |
| Anular una venta | Requiere motivo; revierte el pedido a `CANCELADO` y repone el plato como disponible en producción | `PATCH /ventas/{id}/anular` | ✅ (rol ADMIN/GERENTE_SUCURSAL) |
| Historial de ventas | Listado por rango de fechas, filtrable por sucursal | `GET /ventas`, `/ventas/total`, `/ventas/top-productos` | ✅ |
| Alta de pensionado | Registra al pensionado y crea automáticamente su `Usuario` (rol `PENSIONADO`) | `POST /pensionados` | ✅ |
| Baja / reactivación de pensionado | Voluntaria (manual) o automática (sin asistencia 3 meses, ver §6) | `PATCH /pensionados/{id}/baja`, `/reactivar` | ✅ |
| Registrar asistencia diaria de pensionado | Un registro por pensionado/día | `POST /pensionados/{id}/asistencia` | ✅ |
| Generar cobro mensual de un pensionado | Monto fijo según `TipoAlmuerzo` + saldo arrastrado de meses anteriores | `POST /pensionados/{id}/cobro/generar` | ✅ manual, y ahora también **automático** el día 1 de cada mes (ver §6) |
| Registrar pago de un pensionado | Pago parcial o total; si no alcanza, el resto queda como `saldoPendiente` para el próximo mes | `POST /pensionados/cobro/pagar` | ✅ |
| Gestión de clientes / fidelización | Estado evoluciona solo (`NUEVO → POSIBLE_ACTIVO → ACTIVO → POSIBLE_INACTIVO → INACTIVO`, `RECUPERADO` al volver a comprar) | `POST/GET /clientes` + scheduler diario | ✅ |
| Administración (empleados, roles, módulos, usuarios, sucursales, proveedores, tipos de almuerzo, categorías) | CRUD estándar | Múltiples | ✅ |
| Reportes / dashboard con gráficos | Pantalla **Reportes**: calendario mensual de ventas, ventas por rango con gráfico de barras, cobros de pensionados, top productos, **rentabilidad por plato** y **comparativo entre sucursales** (esta última solo visible para usuarios sin sucursal fija) | `GET /ventas/...`, `/ventas/rentabilidad`, `/ventas/comparativo-sucursales` | ✅ (Fase 3 agregó rentabilidad y comparativo) |
| Cierre de caja / arqueo por turno | Pantalla **Cierre de caja**: abrir turno con monto inicial en efectivo, vender normalmente, registrar ingresos/retiros intermedios, cerrar turno declarando el efectivo contado — el sistema calcula el efectivo esperado (monto inicial + ventas en efectivo + ingresos − retiros) y la diferencia | `POST/PATCH/GET /cierres-caja/...`, `POST/GET /cierres-caja/{id}/movimientos` | ✅ (Fase 2, retiros/ingresos agregados en Fase 4) — no bloquea la venta si no hay turno abierto, es una capa de control adicional |

## 4. Módulo Cocina (`frontend/cocina`)

| Caso de uso | Cómo se hace | Endpoint(s) | Estado |
|---|---|---|---|
| Ver la cola de pedidos en vivo | Kanban Pendiente → Preparando → Listo → Entregado, filtrado por la sucursal activa. Se refresca al instante por WebSocket (STOMP) cuando ventas crea un pedido o cocina cambia su estado; el polling cada 15s se mantiene como respaldo si el socket se cae | `GET /pedidos/estado/{estado}?sucursalId=` + `ws:.../ws` → `/topic/pedidos/{sucursalId}` | ✅ (Fase 2 agregó el push en tiempo real) |
| Notificación + comanda impresa de pedido nuevo | El evento WS ahora va tipado (`PEDIDO_NUEVO` vs `PEDIDO_ACTUALIZADO`) para poder distinguir un pedido recién creado de un simple cambio de estado. Al llegar `PEDIDO_NUEVO`: suena un beep, aparece un toast y se abre automáticamente una ventana de impresión con el ticket de cocina (insumos no, pero sí sopa/segundo elegido y observaciones). Botón manual "🖨️" en cada tarjeta para reimprimir cualquier pedido | `/topic/pedidos/{sucursalId}` (WS) | ✅ |
| Avanzar el estado de un pedido | Cambia de estado según la máquina de estados (`PENDIENTE→EN_PREPARACION→LISTO→ENTREGADO`) | `PATCH /pedidos/{id}/estado` | ✅ |
| Planificar la producción del día | Crear un plan por sucursal con líneas de sopa/segundo/especial y cantidad planificada | `POST /produccion` | ✅ |
| Registrar cantidad producida | Al aumentar la cantidad producida de una línea, **descuenta automáticamente los insumos** de la receta activa del plato (× la cantidad nueva), vía FEFO. Si falta stock, la operación completa se rechaza. | `PATCH /produccion/lineas/{id}/producida` | ✅ (Fase 1) |
| Ver disponible para vender hoy | `cantidadProducida - cantidadVendida` por línea, usado por Caja | `GET /produccion/hoy/disponibles` | ✅ |
| Definir/versionar receta de un plato | Ingredientes con cantidad y costo; solo una versión activa por plato; solo la activa se usa para descontar insumos | `POST/PUT /recetas/...` | ✅ |
| Sugerencia de preparación con IA | Integración con Gemini a partir de los ingredientes de la receta activa | — (llamada directa a Google desde el frontend) | ✅ |
| Ingresar lote de insumo (compra a proveedor) | Modal con insumo, **proveedor** (opcional), cantidad, precio, número de lote y vencimiento | `POST /inventario/insumos/{id}/lote` | ✅ (proveedor agregado en esta sesión) |
| Consumo manual / merma de insumo | Descuento FEFO manual, con causa y valor económico | `POST /inventario/insumos/{id}/consumir`, `/merma` | ✅ |
| Ajuste de inventario físico | Sobrescribe el stock actual (para conteos físicos) | `PATCH /inventario/insumos/{id}/ajustar` | ✅ |
| Kárdex de un insumo | Saldo inicial/final, entradas, salidas, valor económico por período | `GET /inventario/insumos/{id}/kardex` | ✅ |
| Alertas de stock bajo y vencimientos | Generadas automáticamente todos los días a las 06:00 | `GET /alertas` + scheduler | ✅ |
| Gestión de insumos, categorías, proveedores, platos, empleados, usuarios, roles, módulos, sucursales | CRUD estándar | Múltiples | ✅ |

## 5. Flujo de negocio de punta a punta (post Fase 1)

```
1. Cocina define la RECETA de un plato (ingredientes + cantidades).
2. Cocina PLANIFICA la producción del día (sucursal + platos + cantidad planificada).
3. Cocina registra CANTIDAD PRODUCIDA
      → se descuentan los insumos de la receta × cantidad (FEFO, con rollback si falta stock).
4. Caja toma un PEDIDO (mostrador o vía pensionado) contra lo disponible hoy.
5. Caja COBRA el pedido
      → se marca ENTREGADO, se incrementa "cantidadVendida" de la línea de producción,
        se actualiza el estado de fidelización del cliente.
6. (Si aplica) Caja ANULA la venta
      → el pedido vuelve a CANCELADO y el plato vuelve a estar disponible
        (no se repone insumo: ya se consumió al cocinar, no al vender).
7. Pensionados: asistencia diaria + cobro mensual (manual o automático el día 1 de cada mes).
```

## 6. Automatizaciones (`SistemaSchedulers`)

| Tarea | Cuándo | Qué hace |
|---|---|---|
| `evaluarEstadosClientes` | Diario 00:30 | Degrada el estado de fidelización de clientes sin compras recientes |
| `procesarBajasPensionados` | Día 1 de mes, 01:00 | Da de baja automática a pensionados sin asistencia en 3 meses |
| `generarCobrosMensuales` | Día 1 de mes, 02:00 | **(Fase 1)** Genera el `CobroMensual` del mes en curso para cada pensionado activo, sin duplicar los ya generados |
| `alertasVencimientoInventario` | Diario 06:00 | Genera alertas de stock mínimo y de lotes por vencer (15/7/3 días) |

## 7. Multisucursal (Fase 1)

- Cada `Empleado` tiene una `Sucursal` fija (opcional). Si el `Usuario` logueado está ligado a un empleado con sucursal, el backend usa **siempre** esa sucursal para crear pedidos, planificar producción y filtrar reportes — ignora cualquier valor que mande el cliente.
- Si el usuario no tiene sucursal fija (típicamente `ADMIN`), el frontend muestra un selector en el topbar (se preselecciona automáticamente la primera sucursal si hay una sola).
- `Venta` ahora tiene su propia `sucursal` (antes solo se podía inferir vía `pedido.sucursal`), lo que permite filtrar ventas, totales y top-productos por sucursal.

## 8. Cierre de caja (Fase 2)

- Un turno de caja (`CierreCaja`) se abre con un monto inicial de efectivo y queda `ABIERTO` hasta que el mismo cajero lo cierra.
- Al cerrar, se suman las ventas no anuladas de ese cajero+sucursal entre la apertura y el cierre, desglosadas por forma de pago (`EFECTIVO/QR/MIXTO/CREDITO_CUENTA`), y se calcula `montoEsperadoEfectivo = montoInicial + ventasEfectivo` y `diferencia = montoFinalDeclarado - montoEsperadoEfectivo`.
- No maneja todavía retiros/ingresos intermedios de caja (limitación conocida) y **no bloquea** la venta normal: se puede cobrar en `Caja` con o sin turno abierto, es una capa de control/reporte adicional.
- Un cajero no puede abrir un segundo turno mientras tenga uno `ABIERTO`.

## 9. Tiempo real cocina↔ventas (Fase 2)

- Canal WebSocket/STOMP en `/ws` (detrás del context-path `/api`, o sea `ws://host:8080/api/ws`), con broker simple en `/topic`.
- La autenticación ocurre a nivel de frame STOMP (no en el handshake HTTP): el frame `CONNECT` lleva el mismo JWT que las peticiones REST (header `Authorization: Bearer ...`), validado por `WebSocketAuthInterceptor` con el mismo `JwtUtils`/`UserDetailsServiceImpl` que usa el filtro HTTP.
- Cada `SUBSCRIBE` a `/topic/pedidos/{sucursalId}` se valida contra la sucursal del usuario (mismo criterio que `SucursalAccessService` en la API REST) — un cajero de una sucursal no puede suscribirse al canal de otra.
- `PedidoServiceImpl` publica en `/topic/pedidos/{sucursalId}` al crear un pedido y al cambiar su estado. Cocina y ventas escuchan ese canal y disparan un refresco inmediato de sus listados; el polling existente (15s en cocina, 30s en ventas) sigue activo como respaldo si el socket se desconecta.

## 10. Costeo y rentabilidad (Fase 3)

- `Insumo.precioUnitario` ya no se sobrescribe con el precio del último lote: cada `POST /inventario/insumos/{id}/lote` recalcula un **costo promedio ponderado** (`(stockAnterior × precioActual + cantidadNueva × precioLote) / stockNuevo`). Esto hace que `Plato.costoEstimado` (calculado desde la receta activa) refleje mejor el costo real de los insumos.
- `GET /ventas/rentabilidad?desde&hasta&sucursalId` (rol ADMIN/GERENTE_SUCURSAL): ingresos, costo estimado y margen por plato en un rango, usando el `costoEstimado` **actual** de cada plato aplicado a todo el período — es una aproximación (no hay una "foto" del costo en el momento de cada venta), no una reconstrucción histórica exacta.
- `GET /ventas/comparativo-sucursales?desde&hasta` (rol ADMIN/GERENTE_SUCURSAL): total y cantidad de ventas por sucursal en un rango. Solo aparece en el frontend para usuarios sin sucursal fija (un cajero de una sola sucursal no tiene nada que comparar).

## 11. Datos semilla y retiros/ingresos de caja (Fase 4, parte 1)

- **Datos semilla**: `config/DatosSemillaRunner` (`ApplicationRunner`, no `data.sql` — con `ddl-auto=update` y sin Flyway/Liquibase un `data.sql` no corre de forma confiable ni en el orden correcto). Al arrancar con una base de datos limpia (sin rol `ADMIN`), crea el catálogo completo de ~25 módulos (uno por cada ruta con `data.modulo` en ambos frontends), una sucursal inicial ("Casa Matriz"), el rol `ADMIN` con todos los módulos, y un usuario `admin` (password temporal logueada una sola vez al arrancar, hay que cambiarla de inmediato). Es idempotente: si el rol `ADMIN` ya existe, no hace nada.
- **Retiros/ingresos de caja**: dentro de un turno abierto (`CierreCaja`), se pueden registrar movimientos de efectivo que no son ventas (`MovimientoCaja`, tipo `INGRESO`/`RETIRO`) — vuelto de caja chica, retiro para depósito, etc. Al cerrar el turno, `montoEsperadoEfectivo` pasa a ser `montoInicial + ventasEfectivo + ingresos − retiros`, reflejando esos movimientos en la diferencia calculada.

## 12. Comanda impresa + notificación en cocina (Fase 4)

Cuando Ventas crea un pedido nuevo, cocina lo recibe por el canal en tiempo real de la Fase 2, pero ahora el evento va tipado (`enums/TipoEventoPedido`: `PEDIDO_NUEVO` vs `PEDIDO_ACTUALIZADO`) para poder distinguir un pedido recién creado de un simple cambio de estado. Al llegar `PEDIDO_NUEVO`, `cola-pedidos.component.ts` dispara un beep (Web Audio API), un toast, y abre automáticamente una ventana de impresión con el ticket de cocina (`core/services/comanda-print.service.ts` — `window.print()`, sin integración de hardware). Cada tarjeta del kanban también tiene un botón manual "🖨️" para reimprimir.

## 13. Inventario de insumos por sucursal (Fase 4)

El catálogo de insumos (`Insumo`: código, nombre, unidad, precio de referencia) sigue siendo único para toda la empresa — la misma receta de un plato aplica en cualquier sucursal. Lo que ahora es **por sucursal**:

- **Stock físico**: nueva entidad `StockInsumo` (insumo + sucursal + cantidad disponible + mínimo). `Insumo.stockActual`/`stockMinimo` ya no existen.
- **Lotes** (`LoteInsumo`) y **movimientos** (`MovimientoInventario`): cada uno pertenece a una sucursal concreta — el FEFO, el kárdex y las mermas se calculan sobre el stock de esa sucursal, no sobre un total global.
- **Producción → consumo de insumos** (Fase 1): al registrar cantidad producida, ahora descuenta del stock de la sucursal donde se produjo, no de un pool compartido con las demás sucursales.
- **Costo** (`Insumo.precioUnitario`, promedio ponderado de la Fase 3): sigue siendo **global** — se pondera contra el stock de todas las sucursales juntas, así el costeo de receta no varía por sucursal.
- **Alertas de stock mínimo y vencimiento**: ahora llevan la sucursal correspondiente; `GET /alertas` las filtra igual que el resto del sistema (fijo para el usuario con sucursal fija, elegible para ADMIN).
- Migración: `config/InventarioSucursalBackfillRunner` (mismo patrón que `VentaSucursalBackfillRunner` de la Fase 1) asigna el stock/lotes/movimientos existentes a la primera sucursal activa, una sola vez, al arrancar sobre una base de datos con datos previos a este cambio.

## 14. Permisos dinámicos reales (Fase 5)

Antes, el menú era dinámico (`Rol` → `Set<ModuloMenu>`) pero la autorización real de cada endpoint solo miraba 7 nombres de rol hardcodeados (`ADMIN`, `COCINERO`, `JEFE_COCINA`, `CAJERO`, `VENDEDOR`, `GERENTE_SUCURSAL`, `ALMACENERO`) — un rol nuevo creado desde `/roles` aparecía en el menú pero recibía 403 en la API.

- Nuevo `security/PermisoEvaluator` (bean `@perm`): `tiene(authentication, 'MOD_X')` consulta la lista de módulos que `UserDetailsImpl` ya calculaba (y que antes no se usaba en ninguna decisión de autorización).
- Los ~100 `@PreAuthorize` con rol explícito en los 20 controllers ahora son `hasAnyRole(...) or @perm.tiene(authentication, 'MOD_X')` — aditivo puro, ningún rol de sistema pierde acceso. Cualquier rol (de sistema o creado a mano) con el módulo correspondiente asignado también puede operar el endpoint.
- `SecurityConfig`: las 14 reglas de path con rol específico se relajaron a `authenticated()` — la restricción real vive en el método, igual que ya funcionaba para `/pedidos`, `/produccion` y `/alertas`.

## 15. Tests automatizados (Fase 5)

`restaurante/src/test/java/com/restaurante/` — tests unitarios con Mockito (sin Spring context ni base de datos) sobre los flujos más críticos: `VentaServiceImplTest` (cobro, vuelto, anulación), `InventarioServiceImplTest` (FEFO, promedio ponderado global, aislamiento de stock por sucursal), `CierreCajaServiceImplTest` (turno duplicado, cálculo de diferencia con ingresos/retiros), `PensionadoServiceImplTest` (arrastre de saldo, pago completo), `PermisoEvaluatorTest`. 20 tests, `mvn test` para correrlos.

## 16. Lo que falta (roadmap)

Con esto se cierra el roadmap original de Fases 1–5. Próximos candidatos a evaluar: retiros/ingresos de caja con reportes por turno consolidados, notificaciones push a dispositivos móviles, y ampliar la cobertura de tests a los controllers (actualmente solo se cubre la capa de servicio).
