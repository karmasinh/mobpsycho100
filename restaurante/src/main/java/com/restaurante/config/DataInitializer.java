package com.restaurante.config;

import com.restaurante.entity.Empleado;
import com.restaurante.entity.ModuloMenu;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.UnidadMedida;
import com.restaurante.entity.Usuario;
import com.restaurante.enums.EstadoEmpleado;
import com.restaurante.enums.TipoMagnitud;
import com.restaurante.enums.TurnoEmpleado;
import com.restaurante.repository.EmpleadoRepository;
import com.restaurante.repository.ModuloMenuRepository;
import com.restaurante.repository.RolRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.repository.UnidadMedidaRepository;
import com.restaurante.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Única fuente de verdad para los datos semilla del sistema: módulos, roles
 * base, unidades de medida, sucursal inicial, usuario admin y un usuario de
 * prueba por cada rol operativo. Todo idempotente (solo inserta si falta).
 *
 * Antes existían dos inicializadores (`DataInitializer` + `DatosSemillaRunner`)
 * que sembraban los mismos módulos con `sistema`/`ruta`/`icono` distintos, y
 * el segundo se autodescartaba si el rol ADMIN ya existía — como Spring no
 * garantiza el orden entre dos `CommandLineRunner`/`ApplicationRunner` sin
 * `@Order`, en un arranque limpio típico la sucursal inicial podía no
 * llegar a crearse nunca. Se consolidó en esta única clase para eliminar
 * esa condición de carrera.
 *
 * <p>{@code @Order(0)} deja explícito que debe correr antes que cualquier otro
 * {@link CommandLineRunner} del contexto (ej. {@link DatosPruebaRunner}, que asume que
 * la sucursal inicial, los roles y el admin ya existen) — sin esto, Spring no garantiza
 * el orden entre runners sin anotar.
 */
@Component
@RequiredArgsConstructor
@Order(0)
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    private static final String SUCURSAL_INICIAL = "Casa Matriz";

    private final ModuloMenuRepository moduloMenuRepository;
    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final SucursalRepository sucursalRepository;
    private final EmpleadoRepository empleadoRepository;
    private final UnidadMedidaRepository unidadMedidaRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        cargarModulos();
        cargarRolesBase();
        cargarUnidadesMedida();
        Sucursal sucursalInicial = cargarSucursalInicial();
        crearAdminSiNoExiste();
        crearUsuariosBaseSiNoExisten(sucursalInicial);
    }

    // ─── Módulos fijos del sistema ─────────────────────────────────

    private void cargarModulos() {
        log.info("[Init] Cargando módulos del sistema...");

        // ── COCINA ────────────────────────────────────────────────
        ModuloMenu cocina = guardarModulo("MOD_COCINA", "Cocina", "chef-hat", "/cocina", null, 1, "COCINA");

        guardarModulo("MOD_PEDIDOS_COCINA",    "Pedidos en cola",    "clipboard-list",  "/cocina/pedidos",     cocina, 2,  "COCINA");
        guardarModulo("MOD_PRODUCCION",        "Producción del día", "flame",           "/cocina/produccion",  cocina, 3,  "COCINA");
        guardarModulo("MOD_RECETAS",           "Recetas",            "book-open",       "/cocina/recetas",     cocina, 4,  "COCINA");
        guardarModulo("MOD_PLATOS",            "Platos",             "utensils",        "/cocina/platos",      cocina, 5,  "COCINA");
        guardarModulo("MOD_INVENTARIO",        "Inventario",         "package",         "/cocina/inventario",  cocina, 6,  "COCINA");
        guardarModulo("MOD_INSUMOS",           "Insumos",            "database",        "/cocina/insumos",     cocina, 7,  "COCINA");
        guardarModulo("MOD_PROVEEDORES",       "Proveedores",        "truck",           "/cocina/proveedores", cocina, 8,  "COCINA");
        guardarModulo("MOD_ALERTAS_INV",       "Alertas inventario", "bell",            "/cocina/alertas",     cocina, 9,  "COCINA");
        guardarModulo("MOD_CATEGORIAS_INSUMO", "Categorías de insumo", "tag",           "/cocina/categorias-insumo", cocina, 10, "COCINA");
        guardarModulo("MOD_MERMAS",            "Mermas",               "trash-2",       "/cocina/mermas",            cocina, 11, "COCINA");
        guardarModulo("MOD_KARDEX",            "Kárdex",               "bar-chart-2",   "/cocina/kardex",            cocina, 12, "COCINA");
        guardarModulo("MOD_AUDITORIA_COCINA",  "Auditoría",            "file-text",     "/cocina/auditoria",         cocina, 13, "COCINA");

        // ── VENTAS ────────────────────────────────────────────────
        ModuloMenu ventas = guardarModulo("MOD_VENTAS", "Ventas", "dollar-sign", "/ventas", null, 10, "VENTAS");

        guardarModulo("MOD_CAJA",              "Caja / Nueva venta", "wallet",          "/ventas/caja",        ventas, 11, "VENTAS");
        guardarModulo("MOD_PEDIDOS_VENTAS",    "Pedidos",            "shopping-bag",    "/ventas/pedidos",     ventas, 12, "VENTAS");
        guardarModulo("MOD_CLIENTES",          "Clientes",           "users",           "/ventas/clientes",    ventas, 13, "VENTAS");
        guardarModulo("MOD_PENSIONADOS",       "Pensionados",        "user-check",      "/ventas/pensionados", ventas, 14, "VENTAS");
        guardarModulo("MOD_COBROS",            "Cobros mensuales",   "credit-card",     "/ventas/cobros",      ventas, 15, "VENTAS");
        guardarModulo("MOD_ASISTENCIA",        "Asistencia",         "calendar-check",  "/ventas/asistencia",  ventas, 16, "VENTAS");
        guardarModulo("MOD_TIPOS_ALMUERZO",    "Tipos de almuerzo",  "utensils",        "/ventas/almuerzos",   ventas, 17, "VENTAS");
        guardarModulo("MOD_CATEGORIAS_PLATO",  "Categorías de plato","tag",             "/ventas/categorias",      ventas, 18, "VENTAS");
        guardarModulo("MOD_HISTORIAL_VENTAS",  "Historial de ventas","history",          "/ventas/historial-ventas", ventas, 19, "VENTAS");
        guardarModulo("MOD_ALERTAS_VENTAS",    "Centro de alertas",  "bell",             "/ventas/alertas",          ventas, 20, "VENTAS");
        guardarModulo("MOD_REPORTES",          "Reportes",           "bar-chart",        "/ventas/reportes",         ventas, 21, "VENTAS");

        // ── ADMIN ─────────────────────────────────────────────────
        ModuloMenu admin = guardarModulo("MOD_ADMIN", "Administración", "settings", "/admin", null, 20, "ADMIN");

        guardarModulo("MOD_EMPLEADOS",         "Empleados",          "id-card",         "/admin/empleados",    admin, 21, "ADMIN");
        guardarModulo("MOD_ROLES",             "Roles y permisos",   "shield",          "/admin/roles",        admin, 22, "ADMIN");
        guardarModulo("MOD_USUARIOS",          "Usuarios",           "user-cog",        "/admin/usuarios",     admin, 23, "ADMIN");
        guardarModulo("MOD_SUCURSALES",        "Sucursales",         "building",        "/admin/sucursales",   admin, 24, "ADMIN");
        guardarModulo("MOD_AUDITORIA",         "Auditoría",          "file-text",       "/admin/auditoria",    admin, 25, "ADMIN");
        guardarModulo("MOD_ALERTAS_SISTEMA",   "Alertas del sistema","alert-triangle",  "/admin/alertas",      admin, 26, "ADMIN");
        guardarModulo("MOD_MODULOS",           "Módulos y Menús",    "layout",          "/admin/modulos",      admin, 27, "ADMIN");

        log.info("[Init] Módulos cargados correctamente.");
    }

    /**
     * Crea el módulo si no existe, o normaliza sus datos de catálogo (nombre,
     * ícono, ruta, padre, orden, sistema) si ya existía con valores
     * distintos — así una base de datos sembrada por una versión anterior
     * (ej. con íconos emoji en vez de nombres Lucide) converge sola en el
     * próximo arranque, sin depender del orden de inicializadores. No toca
     * `activo`: si un admin desactivó el módulo manualmente, se respeta.
     */
    private ModuloMenu guardarModulo(String codigo, String nombre, String icono,
                                      String ruta, ModuloMenu padre, int orden, String sistema) {
        return moduloMenuRepository.findByCodigo(codigo)
                .map(existente -> {
                    boolean cambio = !nombre.equals(existente.getNombre())
                            || !icono.equals(existente.getIcono())
                            || !ruta.equals(existente.getRuta())
                            || orden != existente.getOrden()
                            || !sistema.equals(existente.getSistema());
                    if (cambio) {
                        existente.setNombre(nombre);
                        existente.setIcono(icono);
                        existente.setRuta(ruta);
                        existente.setPadre(padre);
                        existente.setOrden(orden);
                        existente.setSistema(sistema);
                        return moduloMenuRepository.save(existente);
                    }
                    return existente;
                })
                .orElseGet(() -> moduloMenuRepository.save(ModuloMenu.builder()
                        .codigo(codigo).nombre(nombre).icono(icono).ruta(ruta)
                        .padre(padre).orden(orden).sistema(sistema).activo(true)
                        .build()));
    }

    // ─── Roles base ───────────────────────────────────────────────

    private void cargarRolesBase() {
        crearRolConModulos("ADMIN",
                List.of(
                    // Cocina
                    "MOD_COCINA","MOD_PEDIDOS_COCINA","MOD_PRODUCCION","MOD_RECETAS",
                    "MOD_PLATOS","MOD_INVENTARIO","MOD_INSUMOS","MOD_PROVEEDORES",
                    "MOD_ALERTAS_INV","MOD_CATEGORIAS_INSUMO","MOD_MERMAS","MOD_KARDEX",
                    "MOD_AUDITORIA_COCINA",
                    // Ventas
                    "MOD_VENTAS","MOD_CAJA","MOD_PEDIDOS_VENTAS","MOD_CLIENTES",
                    "MOD_PENSIONADOS","MOD_COBROS","MOD_ASISTENCIA",
                    "MOD_TIPOS_ALMUERZO","MOD_CATEGORIAS_PLATO",
                    "MOD_HISTORIAL_VENTAS","MOD_ALERTAS_VENTAS","MOD_REPORTES",
                    // Admin
                    "MOD_ADMIN","MOD_EMPLEADOS","MOD_ROLES","MOD_USUARIOS",
                    "MOD_SUCURSALES","MOD_AUDITORIA","MOD_ALERTAS_SISTEMA","MOD_MODULOS"
                ),
                "Acceso total al sistema");

        crearRolConModulos("COCINERO",
                List.of("MOD_COCINA","MOD_PEDIDOS_COCINA","MOD_PRODUCCION","MOD_RECETAS",
                        "MOD_PLATOS","MOD_INVENTARIO","MOD_ALERTAS_INV","MOD_CATEGORIAS_INSUMO",
                        "MOD_MERMAS"),
                "Acceso al módulo de cocina y producción");

        crearRolConModulos("JEFE_COCINA",
                List.of("MOD_COCINA","MOD_PEDIDOS_COCINA","MOD_PRODUCCION","MOD_RECETAS",
                        "MOD_PLATOS","MOD_INVENTARIO","MOD_INSUMOS","MOD_PROVEEDORES",
                        "MOD_ALERTAS_INV","MOD_CATEGORIAS_INSUMO","MOD_MERMAS","MOD_KARDEX",
                        "MOD_AUDITORIA_COCINA"),
                "Jefe de cocina con gestión de insumos y proveedores");

        crearRolConModulos("ALMACENERO",
                List.of("MOD_INSUMOS","MOD_CATEGORIAS_INSUMO","MOD_INVENTARIO",
                        "MOD_MERMAS","MOD_KARDEX","MOD_PROVEEDORES","MOD_ALERTAS_INV"),
                "Almacén: insumos, lotes, inventario y proveedores");

        crearRolConModulos("CAJERO",
                List.of("MOD_VENTAS","MOD_CAJA","MOD_PEDIDOS_VENTAS","MOD_CLIENTES",
                        "MOD_PENSIONADOS","MOD_COBROS","MOD_ASISTENCIA",
                        "MOD_TIPOS_ALMUERZO","MOD_HISTORIAL_VENTAS","MOD_ALERTAS_VENTAS"),
                "Cajero: ventas, clientes, pensionados");

        crearRolConModulos("VENDEDOR",
                List.of("MOD_VENTAS","MOD_CAJA","MOD_PEDIDOS_VENTAS","MOD_CLIENTES",
                        "MOD_PENSIONADOS","MOD_COBROS","MOD_ASISTENCIA",
                        "MOD_TIPOS_ALMUERZO","MOD_HISTORIAL_VENTAS","MOD_ALERTAS_VENTAS"),
                "Vendedor: ventas, clientes, pensionados");

        crearRolConModulos("GERENTE_SUCURSAL",
                List.of("MOD_VENTAS","MOD_CAJA","MOD_PEDIDOS_VENTAS","MOD_CLIENTES",
                        "MOD_PENSIONADOS","MOD_COBROS","MOD_ASISTENCIA",
                        "MOD_TIPOS_ALMUERZO","MOD_CATEGORIAS_PLATO",
                        "MOD_HISTORIAL_VENTAS","MOD_ALERTAS_VENTAS","MOD_REPORTES",
                        "MOD_EMPLEADOS","MOD_ALERTAS_SISTEMA"),
                "Gerente de sucursal con acceso a reportes");

        crearRolConModulos("PENSIONADO",
                List.of("MOD_ASISTENCIA","MOD_COBROS"),
                "Acceso básico del pensionado");

        log.info("[Init] Roles base cargados.");
    }

    private void crearRolConModulos(String nombre, List<String> codigos, String descripcion) {
        Rol rol = rolRepository.findByNombre(nombre).orElseGet(() ->
                Rol.builder()
                        .nombre(nombre)
                        .descripcion(descripcion)
                        .activo(true)
                        .modulos(new HashSet<>())
                        .build());

        Set<ModuloMenu> modulos = rol.getModulos();
        boolean modificado = false;

        for (String codigo : codigos) {
            Optional<ModuloMenu> moduloOpt = moduloMenuRepository.findByCodigo(codigo);
            if (moduloOpt.isPresent()) {
                ModuloMenu m = moduloOpt.get();
                if (!modulos.contains(m)) {
                    modulos.add(m);
                    modificado = true;
                }
            }
        }

        if (modificado || rol.getId() == null) {
            rol.setModulos(modulos);
            rolRepository.save(rol);
            log.info("[Init] Rol '{}' creado/actualizado con {} módulos.", nombre, modulos.size());
        }
    }

    // ─── Unidades de medida (con conversión) ───────────────────────

    private void cargarUnidadesMedida() {
        guardarUnidad("g",      "Gramo",       TipoMagnitud.MASA,    1.0);
        guardarUnidad("kg",     "Kilogramo",   TipoMagnitud.MASA,    1000.0);
        guardarUnidad("mg",     "Miligramo",   TipoMagnitud.MASA,    0.001);
        guardarUnidad("ml",     "Mililitro",   TipoMagnitud.VOLUMEN, 1.0);
        guardarUnidad("l",      "Litro",       TipoMagnitud.VOLUMEN, 1000.0);
        guardarUnidad("unidad", "Unidad",      TipoMagnitud.UNIDAD,  1.0);
        guardarUnidad("docena", "Docena",      TipoMagnitud.UNIDAD,  12.0);
        log.info("[Init] Unidades de medida cargadas.");
    }

    private void guardarUnidad(String codigo, String nombre, TipoMagnitud tipo, double factorABase) {
        unidadMedidaRepository.findByCodigo(codigo).orElseGet(() ->
                unidadMedidaRepository.save(UnidadMedida.builder()
                        .codigo(codigo).nombre(nombre).tipoMagnitud(tipo).factorABase(factorABase)
                        .build()));
    }

    // ─── Sucursal inicial ───────────────────────────────────────────

    private Sucursal cargarSucursalInicial() {
        return sucursalRepository.findByNombre(SUCURSAL_INICIAL).orElseGet(() -> {
            Sucursal creada = sucursalRepository.save(Sucursal.builder()
                    .nombre(SUCURSAL_INICIAL)
                    .direccion("")
                    .telefono("")
                    .activo(true)
                    .build());
            log.info("[Init] Sucursal inicial '{}' creada.", SUCURSAL_INICIAL);
            return creada;
        });
    }

    // ─── Usuario admin por defecto ─────────────────────────────────

    // Contraseña de arranque: se mantiene "admin123" (no "Admin123!", que usaba la
    // versión anterior de esta clase antes de consolidar con DatosSemillaRunner)
    // porque es la que documenta AGENTS.md como credencial semilla del proyecto y
    // la que ya usan las bases de datos de desarrollo existentes. Cambiar en producción.
    private static final String PASSWORD_ADMIN_INICIAL = "admin123";

    private void crearAdminSiNoExiste() {
        if (usuarioRepository.existsByUsername("admin")) return;

        Rol rolAdmin = rolRepository.findByNombre("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado"));

        usuarioRepository.save(Usuario.builder()
                .username("admin")
                .passwordHash(passwordEncoder.encode(PASSWORD_ADMIN_INICIAL))
                .rol(rolAdmin)
                .activo(true)
                .intentosFallidos(0)
                .build());

        log.info("[Init] Usuario 'admin' creado. Contraseña por defecto: {} — ¡Cámbiela en producción!", PASSWORD_ADMIN_INICIAL);
    }

    // ─── Usuarios base de prueba (uno por rol operativo) ────────────

    private record UsuarioBaseDef(String rol, String username, String password,
                                   String nombre, String apellido, String ci, String cargo) {}

    private void crearUsuariosBaseSiNoExisten(Sucursal sucursal) {
        List<UsuarioBaseDef> base = List.of(
                new UsuarioBaseDef("COCINERO",         "cocinero1",   "Cocina123!",    "Cocinero",   "Base", "COC-0001", "Cocinero"),
                new UsuarioBaseDef("JEFE_COCINA",       "jefecocina1", "JefeCocina123!","Jefe",       "Cocina", "JCO-0001", "Jefe de cocina"),
                new UsuarioBaseDef("ALMACENERO",        "almacenero1", "Almacen123!",   "Almacenero", "Base", "ALM-0001", "Almacenero"),
                new UsuarioBaseDef("CAJERO",            "cajero1",     "Cajero123!",    "Cajero",     "Base", "CAJ-0001", "Cajero"),
                new UsuarioBaseDef("VENDEDOR",          "vendedor1",   "Vendedor123!",  "Vendedor",   "Base", "VEN-0001", "Vendedor"),
                new UsuarioBaseDef("GERENTE_SUCURSAL",  "gerente1",    "Gerente123!",   "Gerente",    "Sucursal", "GER-0001", "Gerente de sucursal")
        );

        for (UsuarioBaseDef def : base) {
            if (usuarioRepository.existsByUsername(def.username())) continue;

            Rol rol = rolRepository.findByNombre(def.rol()).orElse(null);
            if (rol == null) continue;

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

            log.info("[Init] Usuario base '{}' ({}) creado.", def.username(), def.rol());
        }
    }
}
