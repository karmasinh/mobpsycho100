Fase 2 — Cierre de caja + tiempo real cocina↔ventas
Contexto
Con la Fase 1 ya en producción (multisucursal real, receta→insumo, cobro automático de pensionados), los dos huecos operativos más importantes que quedan pendientes del diagnóstico original son:

No hay cierre/arqueo de caja: VentaController solo da un total agregado por rango de fechas; no existe apertura de turno, conteo de efectivo declarado ni diferencia contra lo que el sistema registró.
Cocina y ventas se enteran de pedidos nuevos/cambios de estado por polling (cola-pedidos.component.ts en cocina cada 15s, pedidos.component.ts en ventas cada 30s), no en tiempo real.
Esta fase agrega ambas cosas. Son independientes entre sí (no comparten código), así que se implementan como dos bloques secuenciales dentro de la misma fase.

Parte A — Cierre de caja por turno
Modelo de negocio: un turno de caja es "abrir caja con un monto inicial de efectivo → vender durante el turno → cerrar caja declarando el efectivo contado". El sistema calcula el efectivo esperado (monto inicial + ventas en efectivo del turno) y la diferencia contra lo declarado. No se maneja todavía retiros/ingresos intermedios de caja (fuera de alcance, se anota como límite conocido). Abrir/cerrar caja no bloquea la venta normal (VentaController.cobrar sigue funcionando igual, tenga o no turno abierto) — es una capa de control/reporte adicional, no un gate.

Backend
Nuevo enum enums/EstadoCierreCaja (ABIERTO, CERRADO).
Nueva entidad entity/CierreCaja: sucursal (ManyToOne), cajero (ManyToOne Usuario, mismo patrón que Venta.cajero), fechaApertura, fechaCierre (nullable), montoInicial, montoFinalDeclarado (nullable hasta el cierre), totalVentasEfectivo/Qr/Mixto/Credito, totalVentasGeneral, cantidadVentas, montoEsperadoEfectivo, diferencia, observaciones, estado.
VentaRepository: nuevo método findByCajero_IdAndSucursalIdAndCreadoEnBetweenAndAnuladaFalse(usuarioId, sucursalId, desde, hasta) para poder sumar las ventas del turno al cerrar.
repository/CierreCajaRepository: findByCajero_IdAndEstado(usuarioId, ABIERTO) (para saber si ya hay un turno abierto), findBySucursalIdOrderByFechaAperturaDesc.
service/CierreCajaService + impl/CierreCajaServiceImpl:
abrir(sucursalId, montoInicial, usuarioId): rechaza con NegocioException si el cajero ya tiene un turno ABIERTO.
cerrar(id, montoFinalDeclarado, observaciones, usuarioId): trae las ventas del cajero+sucursal entre fechaApertura y ahora, agrupa por FormaPago, calcula montoEsperadoEfectivo = montoInicial + totalEfectivo y diferencia = montoFinalDeclarado - montoEsperadoEfectivo, guarda y marca CERRADO.
obtenerAbiertoPorCajero(usuarioId), obtenerPorId(id), listarPorSucursal(sucursalId).
controller/CierreCajaController (/cierres-caja, roles CAJERO,VENDEDOR,ADMIN): POST /abrir, PATCH /{id}/cerrar, GET /abierto (turno abierto del usuario autenticado), GET /{id}, GET /sucursal/{sucursalId} (usa SucursalAccessService.resolver, mismo patrón que PedidoController/ProduccionController).
SecurityConfig: agregar /cierres-caja/** con los mismos roles que /ventas/**.
Frontend (ventas)
core/models/index.ts + core/services/api.service.ts: agregar tipo CierreCaja y CierreCajaService (abrir/cerrar/obtenerAbierto/listarPorSucursal), mismo patrón que el resto de servicios del archivo.
Nueva feature features/cierre-caja/cierre-caja.component.ts: si no hay turno abierto → formulario "Abrir caja" (monto inicial); si hay uno abierto → resumen en vivo (hora de apertura, monto inicial) + botón "Cerrar caja" (monto final contado) que muestra la diferencia calculada al confirmar. Sigue el mismo estilo de tarjeta/formulario que caja.component.ts.
Nueva ruta cierre-caja en app.routes.ts (sin data.modulo, mismo patrón que pedidos/historial-ventas/alertas) + entrada en el mapa de emojis del sidebar (shell.component.ts).
Parte B — Tiempo real cocina↔ventas (WebSocket/STOMP)
Alcance: cuando se crea un pedido o cambia de estado, todos los clientes conectados a la sucursal correspondiente se enteran al instante, en vez de esperar el próximo poll. El polling existente se mantiene como respaldo (red de seguridad si el socket se cae), simplemente se agrega un "empujón" inmediato por WebSocket.

Backend
pom.xml: agregar spring-boot-starter-websocket.
config/WebSocketConfig implements WebSocketMessageBrokerConfigurer: habilita broker simple en /topic, registra endpoint /ws con setAllowedOriginPatterns("*") (coherente con el CORS permisivo ya usado en SecurityConfig), sin SockJS (los navegadores modernos soportan WebSocket nativo y el cliente STOMP del frontend habla directo).
security/websocket/WebSocketAuthInterceptor implements ChannelInterceptor, registrado en configureClientInboundChannel:
En CONNECT: lee el header STOMP Authorization, valida el JWT con el JwtUtils existente, carga UserDetailsImpl vía UserDetailsServiceImpl (mismo mecanismo que JwtAuthenticationFilter), y lo deja como Principal de la sesión STOMP.
En SUBSCRIBE: si el destino matchea /topic/pedidos/{sucursalId}, valida sucursalId contra el UserDetailsImpl de la sesión usando el mismo SucursalAccessService.resolver ya existente (si el usuario tiene sucursal fija distinta, rechaza la suscripción).
SecurityConfig: agregar /ws/** a PUBLIC_URLS (la autenticación real ocurre en el interceptor STOMP, no en el handshake HTTP — patrón estándar de Spring para WebSocket+JWT).
PedidoServiceImpl: inyectar SimpMessagingTemplate y publicar en /topic/pedidos/{sucursalId} el pedido (mismo objeto que ya devuelve la API, Jackson lo serializa igual) en dos puntos: al final de crear() y al final de cambiarEstado().
Frontend (ambos proyectos)
Agregar dependencia @stomp/stompjs (cliente STOMP liviano sobre WebSocket nativo, sin necesidad de SockJS) a frontend/ventas y frontend/cocina.
Nuevo core/services/realtime.service.ts en cada frontend: conecta a ws://localhost:8080/ws (usar environment.apiUrl para derivar el host) con connectHeaders: { Authorization: 'Bearer ' + auth.getToken() }, expone pedidosSucursal$(sucursalId) que se suscribe a /topic/pedidos/{sucursalId} y emite cada mensaje recibido. Reconecta automáticamente (reconnectDelay de @stomp/stompjs).
frontend/cocina/src/app/features/pedidos/cola-pedidos.component.ts: en ngOnInit, además del setInterval ya existente, suscribirse a realtimeService.pedidosSucursal$(auth.sucursalActiva()) y llamar cargarPedidos() en cada evento; desuscribirse en ngOnDestroy.
frontend/ventas/src/app/features/pedidos/pedidos.component.ts: mismo patrón — suscribirse y disparar cargar() en cada evento, manteniendo el interval(30_000) existente como respaldo.
Verificación
Backend: mvn -o compile para confirmar que compila con la nueva entidad/websocket.
Cierre de caja: abrir turno con monto inicial, hacer un par de ventas en efectivo desde Caja, cerrar turno declarando un monto distinto al esperado y confirmar que la diferencia calculada es correcta; confirmar que no se puede abrir un segundo turno mientras el primero sigue ABIERTO.
Tiempo real: levantar backend + ambos ng serve, crear un pedido desde Ventas y confirmar que aparece en la cola de cocina sin esperar los 15s del poll; cambiar su estado desde cocina y confirmar que se refleja de inmediato en ventas.
Confirmar que un usuario de una sucursal no puede suscribirse al topic de otra sucursal (probar cambiando manualmente el destino en el cliente STOMP del navegador, debería rechazar la suscripción).