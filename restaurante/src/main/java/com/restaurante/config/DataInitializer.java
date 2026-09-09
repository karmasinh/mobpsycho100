package com.restaurante.config;

import com.restaurante.entity.ModuloMenu;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Usuario;
import com.restaurante.repository.ModuloMenuRepository;
import com.restaurante.repository.RolRepository;
import com.restaurante.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Optional;

/**
 * Carga inicial de datos: módulos fijos del sistema, roles base y usuario admin.
 * Solo inserta si no existen (idempotente).
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final ModuloMenuRepository moduloMenuRepository;
    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        cargarModulos();
        cargarRolesBase();
        crearAdminSiNoExiste();
    }

    // ─── Módulos fijos del sistema ─────────────────────────────────

    private void cargarModulos() {
        log.info("[Init] Cargando módulos del sistema...");

        // ── COCINA ────────────────────────────────────────────────
        ModuloMenu cocina = guardarModulo("MOD_COCINA", "Cocina", "chef-hat", "/cocina", null, 1, "COCINA");

        guardarModulo("MOD_PEDIDOS_COCINA",    "Pedidos en cola",    "clipboard-list",  "/cocina/pedidos",     cocina, 2,  "COCINA");
        guardarModulo("MOD_PRODUCCION",        "Producción del día", "fire",            "/cocina/produccion",  cocina, 3,  "COCINA");
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

        guardarModulo("MOD_CAJA",              "Caja / Nueva venta", "cash-register",   "/ventas/caja",        ventas, 11, "VENTAS");
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

        guardarModulo("MOD_EMPLEADOS",         "Empleados",          "user-tie",        "/admin/empleados",    admin, 21, "ADMIN");
        guardarModulo("MOD_ROLES",             "Roles y permisos",   "shield",          "/admin/roles",        admin, 22, "ADMIN");
        guardarModulo("MOD_USUARIOS",          "Usuarios",           "user-cog",        "/admin/usuarios",     admin, 23, "ADMIN");
        guardarModulo("MOD_SUCURSALES",        "Sucursales",         "building",        "/admin/sucursales",   admin, 24, "ADMIN");
        guardarModulo("MOD_AUDITORIA",         "Auditoría",          "file-text",       "/admin/auditoria",    admin, 25, "ADMIN");
        guardarModulo("MOD_ALERTAS_SISTEMA",   "Alertas del sistema","alert-triangle",  "/admin/alertas",      admin, 26, "ADMIN");
        guardarModulo("MOD_MODULOS",           "Módulos y Menús",    "layout",          "/admin/modulos",      admin, 27, "ADMIN");

        log.info("[Init] Módulos cargados correctamente.");
    }

    private ModuloMenu guardarModulo(String codigo, String nombre, String icono,
                                      String ruta, ModuloMenu padre, int orden, String sistema) {
        return moduloMenuRepository.findByCodigo(codigo).orElseGet(() ->
                moduloMenuRepository.save(ModuloMenu.builder()
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

        crearRolConModulos("CAJERO",
                List.of("MOD_VENTAS","MOD_CAJA","MOD_PEDIDOS_VENTAS","MOD_CLIENTES",
                        "MOD_PENSIONADOS","MOD_COBROS","MOD_ASISTENCIA",
                        "MOD_TIPOS_ALMUERZO","MOD_HISTORIAL_VENTAS","MOD_ALERTAS_VENTAS"),
                "Cajero: ventas, clientes, pensionados");

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

    // ─── Usuario admin por defecto ─────────────────────────────────

    private void crearAdminSiNoExiste() {
        if (usuarioRepository.existsByUsername("admin")) return;

        Rol rolAdmin = rolRepository.findByNombre("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado"));

        usuarioRepository.save(Usuario.builder()
                .username("admin")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .rol(rolAdmin)
                .activo(true)
                .intentosFallidos(0)
                .build());

        log.info("[Init] Usuario 'admin' creado. Contraseña por defecto: Admin123! — ¡Cámbiela en producción!");
    }
}
