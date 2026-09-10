package com.restaurante.config;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.CrearProduccionRequest;
import com.restaurante.dto.request.PedidoRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.entity.Cliente;
import com.restaurante.entity.Empleado;
import com.restaurante.entity.Insumo;
import com.restaurante.entity.LineaProduccion;
import com.restaurante.entity.Plato;
import com.restaurante.entity.ProduccionDia;
import com.restaurante.entity.Proveedor;
import com.restaurante.entity.Receta;
import com.restaurante.entity.RecetaIngrediente;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.TipoAlmuerzo;
import com.restaurante.entity.Usuario;
import com.restaurante.enums.EstadoCliente;
import com.restaurante.enums.EstadoEmpleado;
import com.restaurante.enums.FormaPago;
import com.restaurante.enums.TipoLineaProduccion;
import com.restaurante.enums.TurnoEmpleado;
import com.restaurante.repository.ClienteRepository;
import com.restaurante.repository.EmpleadoRepository;
import com.restaurante.repository.InsumoRepository;
import com.restaurante.repository.PlatoRepository;
import com.restaurante.repository.RecetaRepository;
import com.restaurante.repository.RolRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.repository.TipoAlmuerzoRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.service.CierreCajaService;
import com.restaurante.service.InventarioService;
import com.restaurante.service.PedidoService;
import com.restaurante.service.PensionadoService;
import com.restaurante.service.ProduccionService;
import com.restaurante.service.ProveedorService;
import com.restaurante.service.UnidadConversionService;
import com.restaurante.service.VentaService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Segunda semilla de datos de prueba: una segunda sucursal con su propio personal,
 * insumos con unidades variadas (para ejercitar la conversión real de
 * {@link UnidadConversionService}), recetas, producción, pedidos, ventas, un cliente
 * y un pensionado con historial de asistencia y cobros.
 *
 * <p>Solo corre si {@code app.seed.datos-prueba=true} (por defecto false, nunca se
 * ejecuta en un arranque normal). Idempotente a nivel de clase: si "Sucursal Sur" ya
 * existe, no hace nada — pensado para correr una sola vez contra una base de datos de
 * prueba, no para ejecutarse repetidamente como {@link DataInitializer}.
 *
 * <p><b>Nota sobre conversión de unidades</b>: la receta de "Milanesa de pollo con
 * papas" usa intencionalmente unidades distintas a las del insumo (aceite vegetal en
 * ml sobre un insumo cargado en litros, sal en g sobre un insumo cargado en kg) para
 * ejercitar la conversión real tanto al costear ({@code RecetaController.crear}) como
 * al producir ({@code ProduccionServiceImpl.consumirInsumosPorReceta}, corregido para
 * convertir con el mismo {@link UnidadConversionService} en vez de descontar la
 * cantidad cruda — ver control de cambios, hallazgo AUD-L-020). Los tres platos de
 * esta semilla se producen y venden.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.datos-prueba", havingValue = "true")
@Order(1)
public class DatosPruebaRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosPruebaRunner.class);
    private static final String SUCURSAL_SUR = "Sucursal Sur";

    private final SucursalRepository sucursalRepository;
    private final EmpleadoRepository empleadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final InsumoRepository insumoRepository;
    private final PlatoRepository platoRepository;
    private final RecetaRepository recetaRepository;
    private final ClienteRepository clienteRepository;
    private final TipoAlmuerzoRepository tipoAlmuerzoRepository;
    private final ProveedorService proveedorService;
    private final InventarioService inventarioService;
    private final ProduccionService produccionService;
    private final PedidoService pedidoService;
    private final VentaService ventaService;
    private final CierreCajaService cierreCajaService;
    private final PensionadoService pensionadoService;
    private final UnidadConversionService unidadConversionService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (sucursalRepository.existsByNombre(SUCURSAL_SUR)) {
            log.info("[DatosPrueba] '{}' ya existe — la segunda semilla no se vuelve a ejecutar.", SUCURSAL_SUR);
            return;
        }

        log.info("[DatosPrueba] Sembrando segundo set de datos de prueba...");

        Sucursal casaMatriz = sucursalRepository.findByNombre("Casa Matriz")
                .orElseThrow(() -> new IllegalStateException(
                        "No existe 'Casa Matriz' — DataInitializer debe correr antes que DatosPruebaRunner."));
        Sucursal sucursalSur = crearSucursalSur();

        Usuario admin = usuarioRepository.findByUsername("admin")
                .orElseThrow(() -> new IllegalStateException("No existe el usuario 'admin'."));
        Empleado cajeroSur = crearPersonalSucursalSur(sucursalSur);
        Usuario usuarioCajeroSur = usuarioRepository.findByEmpleadoId(cajeroSur.getId())
                .orElseThrow(() -> new IllegalStateException("No se pudo crear el usuario del cajero de " + SUCURSAL_SUR));
        Usuario cajero1 = usuarioRepository.findByUsername("cajero1").orElse(admin);

        Proveedor proveedor = crearProveedor();

        Map<String, Insumo> insumos = crearInsumos();
        ingresarStockInicial(insumos, casaMatriz, sucursalSur, proveedor, admin.getId());

        Plato sopaArroz = crearPlato("PLA-SOPA-ARROZ", "Sopa de arroz", "SOPA", 12.0);
        Plato segundoCarne = crearPlato("PLA-SEG-CARNE", "Segundo de carne con papas", "SEGUNDO", 22.0);
        Plato milanesaPollo = crearPlato("PLA-SEG-MILANESA", "Milanesa de pollo con papas", "SEGUNDO", 20.0);

        crearReceta(sopaArroz, List.of(
                new IngredienteSeed(insumos.get("ARROZ"), 0.08, "kg")
        ));
        crearReceta(segundoCarne, List.of(
                new IngredienteSeed(insumos.get("CARNE"), 0.15, "kg"),
                new IngredienteSeed(insumos.get("PAPA"), 0.20, "kg")
        ));
        crearReceta(milanesaPollo, List.of(
                new IngredienteSeed(insumos.get("POLLO"), 0.20, "kg"),
                new IngredienteSeed(insumos.get("PAPA"), 0.15, "kg"),
                new IngredienteSeed(insumos.get("ACEITE"), 15.0, "ml"),   // insumo en litros — conversión real
                new IngredienteSeed(insumos.get("SAL"), 5.0, "g")        // insumo en kg — conversión real
        ));

        ProduccionDia produccionMatriz = planificarYProducir(
                casaMatriz, List.of(sopaArroz, segundoCarne, milanesaPollo), admin.getId());
        ProduccionDia produccionSur = planificarYProducir(
                sucursalSur, List.of(sopaArroz, segundoCarne, milanesaPollo), usuarioCajeroSur.getId());

        Cliente clienteSur = crearCliente(sucursalSur);

        abrirTurnoSiNoTiene(casaMatriz, cajero1.getId());
        abrirTurnoSiNoTiene(sucursalSur, usuarioCajeroSur.getId());
        venderPedido(casaMatriz, null, sopaArroz, 2, segundoCarne, 1, cajero1.getId());
        venderPedido(sucursalSur, clienteSur, sopaArroz, 1, segundoCarne, 2, usuarioCajeroSur.getId());

        TipoAlmuerzo tipoAlmuerzo = crearTipoAlmuerzo();
        sembrarPensionadoConHistorial(tipoAlmuerzo, admin.getId());

        log.info("[DatosPrueba] Segunda semilla completa: sucursal '{}', {} insumos, 3 platos/recetas producidos " +
                        "en ambas sucursales, 2 pedidos vendidos, 1 cliente y 1 pensionado con historial de 2 meses.",
                SUCURSAL_SUR, insumos.size());
    }

    // ─── Sucursal y personal ────────────────────────────────────────

    private Sucursal crearSucursalSur() {
        Sucursal creada = sucursalRepository.save(Sucursal.builder()
                .nombre(SUCURSAL_SUR)
                .direccion("Av. Circunvalación Sur, zona Sur")
                .telefono("46422222")
                .activo(true)
                .build());
        log.info("[DatosPrueba] Sucursal '{}' creada.", SUCURSAL_SUR);
        return creada;
    }

    /** Un cajero y un vendedor propios de Sucursal Sur, para poder probar aislamiento entre sucursales. */
    private Empleado crearPersonalSucursalSur(Sucursal sucursal) {
        Empleado empleadoCajero = null;

        record StaffDef(String rol, String username, String password, String nombre, String apellido,
                         String ci, String cargo) {}

        List<StaffDef> staff = List.of(
                new StaffDef("CAJERO", "cajero2", "Cajero123!", "Cajero", "Sur", "CAJ-0002", "Cajero"),
                new StaffDef("VENDEDOR", "vendedor2", "Vendedor123!", "Vendedor", "Sur", "VEN-0002", "Vendedor")
        );

        for (StaffDef def : staff) {
            if (usuarioRepository.existsByUsername(def.username())) continue;

            Rol rol = rolRepository.findByNombre(def.rol())
                    .orElseThrow(() -> new IllegalStateException("Rol " + def.rol() + " no encontrado"));

            Empleado empleado = empleadoRepository.save(Empleado.builder()
                    .nombre(def.nombre())
                    .apellido(def.apellido())
                    .ci(def.ci())
                    .cargo(def.cargo())
                    .turno(TurnoEmpleado.COMPLETO)
                    .fechaIngreso(LocalDate.now())
                    .estado(EstadoEmpleado.ACTIVO)
                    .sucursal(sucursal)
                    .build());

            usuarioRepository.save(Usuario.builder()
                    .username(def.username())
                    .passwordHash(passwordEncoder.encode(def.password()))
                    .rol(rol)
                    .empleado(empleado)
                    .activo(true)
                    .intentosFallidos(0)
                    .build());

            log.info("[DatosPrueba] Usuario '{}' ({}) creado en {}.", def.username(), def.rol(), SUCURSAL_SUR);

            if ("CAJERO".equals(def.rol())) {
                empleadoCajero = empleado;
            }
        }

        if (empleadoCajero == null) {
            // ya existía de una corrida anterior parcial — no debería pasar dado el guard de clase,
            // pero se resuelve igual para no romper el resto de la semilla.
            empleadoCajero = usuarioRepository.findByUsername("cajero2")
                    .map(Usuario::getEmpleado)
                    .orElseThrow(() -> new IllegalStateException("No se pudo resolver el cajero de " + SUCURSAL_SUR));
        }
        return empleadoCajero;
    }

    // ─── Proveedor ────────────────────────────────────────────────

    private Proveedor crearProveedor() {
        String nit = "9887766-SUR";
        return proveedorService.crear(Proveedor.builder()
                .nit(nit)
                .nombre("Distribuidora del Sur SRL")
                .direccion("Zona Sur, calle 21")
                .telefono("46411111")
                .correo("contacto@distribuidorasur-prueba.test")
                .contacto("Elena Vargas")
                .activo(true)
                .build());
    }

    // ─── Insumos con unidades variadas ──────────────────────────────

    private record InsumoDef(String clave, String codigo, String nombre, String unidad, double precioInicial) {}

    private Map<String, Insumo> crearInsumos() {
        List<InsumoDef> defs = List.of(
                new InsumoDef("PAPA",   "INS-PAPA-01",   "Papa",             "kg",    4.5),
                new InsumoDef("ARROZ",  "INS-ARROZ-01",  "Arroz",            "kg",    8.0),
                new InsumoDef("ACEITE", "INS-ACEITE-01", "Aceite vegetal",   "litro", 14.0),
                new InsumoDef("SAL",    "INS-SAL-01",    "Sal",              "kg",    3.0),
                new InsumoDef("CARNE",  "INS-CARNE-01",  "Carne de res",     "kg",    35.0),
                new InsumoDef("POLLO",  "INS-POLLO-01",  "Pollo",            "kg",    22.0)
        );

        Map<String, Insumo> resultado = new HashMap<>();
        for (InsumoDef def : defs) {
            Insumo insumo = insumoRepository.findByCodigo(def.codigo()).orElseGet(() ->
                    insumoRepository.save(Insumo.builder()
                            .codigo(def.codigo())
                            .nombre(def.nombre())
                            .unidadMedida(def.unidad())
                            .precioUnitario(def.precioInicial())
                            .perecedero(true)
                            .activo(true)
                            .build()));
            resultado.put(def.clave(), insumo);
        }
        log.info("[DatosPrueba] {} insumos de prueba listos (unidades: kg, litro).", resultado.size());
        return resultado;
    }

    private void ingresarStockInicial(Map<String, Insumo> insumos, Sucursal casaMatriz, Sucursal sucursalSur,
                                       Proveedor proveedor, Long usuarioId) {
        Map<String, Double> cantidadPorInsumo = Map.of(
                "PAPA", 50.0, "ARROZ", 30.0, "ACEITE", 5.0, "SAL", 10.0, "CARNE", 20.0, "POLLO", 15.0
        );
        LocalDate vencimiento = LocalDate.now().plusMonths(6);

        int lote = 1;
        for (Sucursal sucursal : List.of(casaMatriz, sucursalSur)) {
            for (Map.Entry<String, Insumo> e : insumos.entrySet()) {
                double cantidad = cantidadPorInsumo.get(e.getKey());
                inventarioService.ingresarLote(
                        e.getValue().getId(), sucursal.getId(), proveedor.getId(),
                        "LOTE-PRUEBA-" + (lote++),
                        cantidad, e.getValue().getPrecioUnitario(),
                        vencimiento, usuarioId);
            }
        }
        log.info("[DatosPrueba] Stock inicial ingresado en '{}' y '{}'.", casaMatriz.getNombre(), SUCURSAL_SUR);
    }

    // ─── Platos y recetas ────────────────────────────────────────────

    private Plato crearPlato(String codigo, String nombre, String tipo, double precioVenta) {
        return platoRepository.findByCodigo(codigo).orElseGet(() ->
                platoRepository.save(Plato.builder()
                        .codigo(codigo)
                        .nombre(nombre)
                        .tipo(tipo)
                        .precioVenta(precioVenta)
                        .costoEstimado(0.0)
                        .activo(true)
                        .build()));
    }

    private record IngredienteSeed(Insumo insumo, double cantidad, String unidadMedida) {}

    /**
     * Replica el costeo de {@code RecetaController.crear}: convierte la cantidad del
     * ingrediente a la unidad del insumo antes de costear, usando el mismo
     * {@link UnidadConversionService} — así se ejercita la conversión real (ml→litro,
     * g→kg) igual que lo haría un usuario creando la receta desde la pantalla de Recetas.
     */
    private Receta crearReceta(Plato plato, List<IngredienteSeed> ingredientesSeed) {
        Receta receta = Receta.builder()
                .plato(plato)
                .version(1)
                .activa(true)
                .notas("Receta de prueba (segunda semilla de datos)")
                .costoTotal(0.0)
                .ingredientes(new ArrayList<>())
                .build();

        double costoTotal = 0.0;
        for (IngredienteSeed ing : ingredientesSeed) {
            String unidadInsumo = ing.insumo().getUnidadMedida();
            var conversion = unidadConversionService.convertir(ing.cantidad(), ing.unidadMedida(), unidadInsumo);
            double cantidadEnUnidadInsumo = conversion.orElse(ing.cantidad());
            double costoIngrediente = cantidadEnUnidadInsumo * ing.insumo().getPrecioUnitario();
            costoTotal += costoIngrediente;

            receta.getIngredientes().add(RecetaIngrediente.builder()
                    .receta(receta)
                    .insumo(ing.insumo())
                    .cantidad(ing.cantidad())
                    .unidadMedida(ing.unidadMedida())
                    .costoIngrediente(costoIngrediente)
                    .build());
        }

        receta.setCostoTotal(costoTotal);
        Receta guardada = recetaRepository.save(receta);

        plato.setCostoEstimado(costoTotal);
        platoRepository.save(plato);

        log.info("[DatosPrueba] Receta creada para '{}' — costo estimado Bs {}.", plato.getNombre(), costoTotal);
        return guardada;
    }

    // ─── Producción del día ──────────────────────────────────────────

    /**
     * Planifica los 3 platos y produce completamente los 2 primeros (sopa y segundo de
     * carne); el tercero (milanesa, con conversión de unidades en su receta) queda solo
     * planificado — ver nota de clase sobre por qué no se produce.
     */
    private ProduccionDia planificarYProducir(Sucursal sucursal, List<Plato> platos, Long usuarioId) {
        CrearProduccionRequest request = new CrearProduccionRequest();
        request.setFecha(LocalDate.now());
        request.setSucursalId(sucursal.getId());

        List<CrearProduccionRequest.LineaRequest> lineas = new ArrayList<>();
        for (Plato plato : platos) {
            CrearProduccionRequest.LineaRequest linea = new CrearProduccionRequest.LineaRequest();
            linea.setPlatoId(plato.getId());
            linea.setTipo(TipoLineaProduccion.SEGUNDO);
            linea.setCantidadPlanificada(20);
            lineas.add(linea);
        }
        // La sopa se marca con su tipo real (SOPA); el resto ya quedó en SEGUNDO arriba.
        lineas.get(0).setTipo(TipoLineaProduccion.SOPA);
        request.setLineas(lineas);

        ProduccionDia produccion = produccionService.crear(request);

        for (LineaProduccion linea : produccion.getLineas()) {
            produccionService.actualizarProducida(linea.getId(), 15, usuarioId);
        }

        log.info("[DatosPrueba] Producción del día registrada en '{}'.", sucursal.getNombre());
        return produccion;
    }

    // ─── Cliente ─────────────────────────────────────────────────────

    private Cliente crearCliente(Sucursal sucursal) {
        return clienteRepository.save(Cliente.builder()
                .nombre("Marcela Rojas Fernández")
                .telefono("70011122")
                .correo("marcela.rojas.prueba@example.com")
                .fechaRegistro(LocalDate.now())
                .estado(EstadoCliente.CLIENTE_NUEVO)
                .sucursal(sucursal)
                .build());
    }

    // ─── Pedidos y ventas ────────────────────────────────────────────

    /** Cobrar exige un turno de caja abierto (ver VentaServiceImpl.cobrar); se abre uno de prueba si el cajero no tiene. */
    private void abrirTurnoSiNoTiene(Sucursal sucursal, Long usuarioId) {
        if (cierreCajaService.obtenerAbiertoPorCajero(usuarioId).isEmpty()) {
            cierreCajaService.abrir(sucursal.getId(), 200.0, usuarioId);
        }
    }

    private void venderPedido(Sucursal sucursal, Cliente cliente,
                               Plato platoA, int cantidadA, Plato platoB, int cantidadB, Long usuarioId) {
        PedidoRequest request = new PedidoRequest();
        request.setSucursalId(sucursal.getId());
        if (cliente != null) request.setClienteId(cliente.getId());
        request.setObservaciones("Pedido de prueba (segunda semilla de datos)");

        PedidoRequest.DetallePedidoRequest detalleA = new PedidoRequest.DetallePedidoRequest();
        detalleA.setPlatoId(platoA.getId());
        detalleA.setCantidad(cantidadA);

        PedidoRequest.DetallePedidoRequest detalleB = new PedidoRequest.DetallePedidoRequest();
        detalleB.setPlatoId(platoB.getId());
        detalleB.setCantidad(cantidadB);

        request.setDetalles(List.of(detalleA, detalleB));

        var pedido = pedidoService.crear(request, usuarioId);
        ventaService.cobrar(pedido.getId(), 100.0, FormaPago.EFECTIVO, usuarioId);

        log.info("[DatosPrueba] Pedido #{} vendido en '{}'.", pedido.getId(), sucursal.getNombre());
    }

    // ─── Pensionado con historial ────────────────────────────────────

    private TipoAlmuerzo crearTipoAlmuerzo() {
        return tipoAlmuerzoRepository.findByNombre("Almuerzo Ejecutivo").orElseGet(() ->
                tipoAlmuerzoRepository.save(TipoAlmuerzo.builder()
                        .nombre("Almuerzo Ejecutivo")
                        .precioMensual(350.0)
                        .descripcion("Sopa + segundo, de lunes a viernes")
                        .diasDisponibles("LUNES,MARTES,MIERCOLES,JUEVES,VIERNES")
                        .activo(true)
                        .build()));
    }

    private void sembrarPensionadoConHistorial(TipoAlmuerzo tipoAlmuerzo, Long usuarioId) {
        PensionadoRequest request = new PensionadoRequest();
        request.setNombre("Jorge");
        request.setApellido("Fernández Quiroga");
        request.setCedula("9988776");
        request.setTelefono("70099887");
        request.setCorreo("jorge.fernandez.prueba@example.com");
        request.setTipoAlmuerzoId(tipoAlmuerzo.getId());
        request.setFechaInscripcion(LocalDate.now().minusMonths(2));
        request.setPasswordInicial("Pension123!");

        var pensionado = pensionadoService.registrar(request);

        YearMonth mesAnterior = YearMonth.now().minusMonths(1);
        YearMonth mesActual = YearMonth.now();

        // Asistencias del mes anterior (pagado) y del actual (pendiente) — días hábiles simples.
        for (int dia = 1; dia <= 5; dia++) {
            pensionadoService.registrarAsistencia(pensionado.getId(), mesAnterior.atDay(dia), usuarioId);
        }
        for (int dia = 1; dia <= 3; dia++) {
            pensionadoService.registrarAsistencia(pensionado.getId(), mesActual.atDay(dia), usuarioId);
        }

        // Mes anterior: cobro generado y pagado por completo.
        CobroMensualRequest pago = new CobroMensualRequest();
        pago.setPensionadoId(pensionado.getId());
        pago.setMes(mesAnterior.getMonthValue());
        pago.setAnio(mesAnterior.getYear());
        pago.setMontoPagado(tipoAlmuerzo.getPrecioMensual());
        pago.setFormaPago(FormaPago.EFECTIVO);
        pensionadoService.registrarPago(pago, usuarioId);

        // Mes actual: cobro generado, queda pendiente de pago (demuestra CU de cobro pendiente).
        pensionadoService.generarCobroMensual(pensionado.getId(), mesActual.getMonthValue(), mesActual.getYear());

        log.info("[DatosPrueba] Pensionado '{}' creado con historial de asistencia y cobros (2 meses).",
                pensionado.getNombreCompleto());
    }
}
