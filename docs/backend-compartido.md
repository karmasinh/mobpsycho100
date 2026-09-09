# Estado del backend compartido

## Propósito y evidencia

Este documento describe el backend que atiende a los frontends Cocina y Ventas. La revisión se realizó sobre `SistemaDesk/SistemaDesk/restaurante`, sus controladores, servicios, entidades, rutas consumidoras y pruebas existentes. El estado es una revisión estática del código; debe cerrarse con pruebas de integración y autorización.

## Unidad del proyecto

El código no se divide por proyecto académico: existe una sola API, una sola base PostgreSQL y entidades relacionadas que son consumidas por los dos frontends. La separación de Luciana y Alison se aplica únicamente a la documentación de alcance, casos de uso y estado de cada consumidor.

## Arquitectura verificada

Spring Boot 3.2.5 con Java 17, Spring Web, JPA, Security, Validation y WebSocket/STOMP. La persistencia usa PostgreSQL y JWT protege la API. El flujo principal es:

```text
Angular Cocina/Ventas → HttpClient + Bearer JWT → Controller
→ Service → Repository/JPA → PostgreSQL
                                   └→ evento STOMP para pedidos
```

Entrada principal: `src/main/java/com/restaurante/controller`. La lógica está en `service/impl`, el acceso en `repository`, el dominio en `entity` y los contratos en `dto`.

## Cobertura por dominio

| Dominio | Controladores y capacidades | Estado |
|---|---|---|
| Seguridad y administración | `Auth`, `Empleado`, `Rol`, `ModuloMenu`, `Sucursal`, `Auditoria`, `Alerta` | IMPLEMENTADO_CON_BRECHA |
| Cocina | `CategoriaInsumo`, `Insumo`, `Inventario`, `Plato`, `Receta`, `Produccion`, `Pedido` | IMPLEMENTADO_CON_BRECHA |
| Ventas | `Cliente`, `Pedido`, `Venta`, `CierreCaja` | IMPLEMENTADO_CON_BRECHA |
| Pensionados | `Pensionado`, `TipoAlmuerzoPensionados` | IMPLEMENTADO_CON_BRECHA |
| Compartido | `Proveedor`, disponibilidad de producción, WebSocket y tareas programadas | IMPLEMENTADO_CON_BRECHA |

No se encontró un módulo principal del frontend sin controlador correspondiente. Las brechas son de cumplimiento y seguridad, no necesariamente de ausencia de endpoints.

## Flujos implementados

- Login devuelve JWT, sistema (`COCINA`, `VENTAS`, `ADMIN`), roles y contexto de usuario.
- Cocina registra lotes, stock, mermas, recetas y producción; la producción puede consumir insumos por FEFO.
- Ventas crea pedidos, cobra, anula ventas, gestiona caja, pensionados, asistencia y reportes.
- Los pedidos publican eventos STOMP y la disponibilidad producida se comparte entre ambos frontends.
- Schedulers generan cobros mensuales, alertas de inventario y cambios automáticos de estado.

## Información recuperada de la documentación que acompaña al software

`docs/DOCUMENTACION.md` registra cinco fases funcionales que deben conservarse como contexto al actualizar los análisis:

1. **Fase 1:** multisucursal, receta→insumo, cobro automático de pensionados y disponibilidad producida.
2. **Fase 2:** cierre de caja por turno y tiempo real Cocina↔Ventas mediante WebSocket/STOMP.
3. **Fase 3:** costo promedio ponderado, rentabilidad por plato y comparativo entre sucursales.
4. **Fase 4:** datos semilla, ingresos/retiros de caja, comanda impresa, notificación en Cocina e inventario por sucursal.
5. **Fase 5:** permisos dinámicos reales por módulo y 20 pruebas unitarias de servicios.

Estas fases explican por qué un caso puede tener endpoint y UI, pero todavía conservar una brecha de seguridad, prueba o regla de negocio.

## Divergencias que deben quedar visibles

- La tabla histórica de puertos en `DOCUMENTACION.md` está invertida respecto a los `package.json` actuales: Cocina usa 4200 y Ventas 4201.
- La documentación histórica contempla una aplicación móvil Android, pero no existe un frontend móvil dentro de este código; debe confirmarse o retirarse del alcance.
- Gemini se invoca directamente desde el frontend mediante una clave de entorno; si se mantiene la funcionalidad, debe evaluarse su traslado al backend.
- El cierre de caja está implementado como control adicional y no bloquea ventas sin turno abierto; esa decisión debe aprobarse como regla de negocio.

## Pendientes prioritarios para cubrir ambos frontends

| Prioridad | Brecha verificable | Trabajo requerido |
|---|---|---|
| Crítica | Varias rutas de `PedidoController` sólo usan `isAuthenticated()` | Validar rol, sucursal efectiva y transición permitida por ID/estado. |
| Crítica | Consultas de producción, platos, sucursales, proveedores, alertas y pensionados tienen lecturas amplias | Aplicar autorización y aislamiento por sucursal donde corresponda. |
| Crítica | Producción permite escenarios que la especificación aún restringe | Decidir y validar receta activa, cantidad planificada, stock insuficiente y estados. |
| Alta | `VentaServiceImpl` no exige turno abierto para vender | Confirmar la regla; si se aprueba, bloquear el cobro sin caja abierta. |
| Alta | Alertas y auditoría no están uniformemente limitadas por sucursal | Probar filtros, lectura, marcado y cobertura de eventos. |
| Alta | Inicializadores de datos pueden duplicar responsabilidades | Revisar `DatosSemillaRunner`/`DataInitializer` y dejar una fuente única. |
| Alta | Pruebas actuales cubren servicios, no todos los contratos HTTP | Añadir integración, seguridad, sucursal y concurrencia para cada caso crítico. |

## Verificación recomendada

Ejecutar desde `SistemaDesk/SistemaDesk/restaurante`: `mvn test` para pruebas existentes y `mvn clean verify` como compuerta completa. Cada resultado debe enlazarse a `CU-L-*` o `CU-A-*`, a la auditoría correspondiente y a una evidencia reproducible.

**Verificación realizada el 2026-09-09:** `mvn test` terminó con 20 pruebas ejecutadas, 0 fallos, 0 errores y `BUILD SUCCESS`. Esto valida servicios seleccionados, no todos los contratos HTTP ni el aislamiento por sucursal.
