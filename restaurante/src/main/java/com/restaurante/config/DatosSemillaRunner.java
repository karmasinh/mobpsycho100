package com.restaurante.config;

import com.restaurante.entity.ModuloMenu;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Usuario;
import com.restaurante.repository.ModuloMenuRepository;
import com.restaurante.repository.RolRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

/**
 * Crea el catálogo base de módulos, la sucursal inicial, el rol ADMIN (con
 * todos los módulos) y un usuario admin, para poder entrar al sistema por
 * primera vez en una base de datos limpia. Idempotente: si el rol ADMIN ya
 * existe, no hace nada — se asume que el sistema ya fue inicializado.
 */
@Component
@RequiredArgsConstructor
public class DatosSemillaRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosSemillaRunner.class);
    private static final String PASSWORD_INICIAL = "admin123";

    private final ModuloMenuRepository moduloMenuRepository;
    private final RolRepository rolRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    private record ModuloDef(String codigo, String nombre, String icono, String ruta, String sistema, int orden) {}

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (rolRepository.existsByNombre("ADMIN")) return;

        log.info("[Semilla] No existe el rol ADMIN — inicializando datos base del sistema...");

        List<ModuloMenu> modulos = new ArrayList<>();
        for (ModuloDef def : catalogoModulos()) {
            ModuloMenu m = moduloMenuRepository.findByCodigo(def.codigo()).orElseGet(() ->
                    moduloMenuRepository.save(ModuloMenu.builder()
                            .codigo(def.codigo())
                            .nombre(def.nombre())
                            .icono(def.icono())
                            .ruta(def.ruta())
                            .sistema(def.sistema())
                            .orden(def.orden())
                            .activo(true)
                            .build()));
            modulos.add(m);
        }

        sucursalRepository.findByNombre("Casa Matriz").orElseGet(() ->
                sucursalRepository.save(Sucursal.builder()
                        .nombre("Casa Matriz")
                        .direccion("")
                        .telefono("")
                        .activo(true)
                        .build()));

        Rol rolAdmin = rolRepository.save(Rol.builder()
                .nombre("ADMIN")
                .descripcion("Acceso total al sistema")
                .activo(true)
                .modulos(new HashSet<>(modulos))
                .build());

        usuarioRepository.save(Usuario.builder()
                .username("admin")
                .passwordHash(passwordEncoder.encode(PASSWORD_INICIAL))
                .rol(rolAdmin)
                .activo(true)
                .intentosFallidos(0)
                .build());

        log.warn("[Semilla] Usuario administrador creado — username: 'admin', password temporal: '{}'. Cámbiala de inmediato.",
                PASSWORD_INICIAL);
    }

    private List<ModuloDef> catalogoModulos() {
        List<ModuloDef> lista = new ArrayList<>();
        int o = 1;

        // Compartidos (ADMIN) — visibles en ambos frontends
        lista.add(new ModuloDef("MOD_SUCURSALES",  "Sucursales",  "🏪", "/admin/sucursales",  "ADMIN", o++));
        lista.add(new ModuloDef("MOD_EMPLEADOS",   "Empleados",   "👤", "/admin/empleados",   "ADMIN", o++));
        lista.add(new ModuloDef("MOD_PROVEEDORES", "Proveedores", "🏭", "/admin/proveedores", "ADMIN", o++));
        lista.add(new ModuloDef("MOD_ROLES",       "Roles",       "🛡️", "/admin/roles",       "ADMIN", o++));
        lista.add(new ModuloDef("MOD_USUARIOS",    "Usuarios",    "👤", "/admin/usuarios",    "ADMIN", o++));

        // Ventas
        lista.add(new ModuloDef("MOD_CAJA",             "Caja",                "💳", "/ventas/caja",        "VENTAS", o++));
        lista.add(new ModuloDef("MOD_CLIENTES",         "Clientes",            "👥", "/ventas/clientes",    "VENTAS", o++));
        lista.add(new ModuloDef("MOD_PENSIONADOS",      "Pensionados",         "🏠", "/ventas/pensionados", "VENTAS", o++));
        lista.add(new ModuloDef("MOD_COBROS",           "Cobros mensuales",    "🧾", "/ventas/cobros",      "VENTAS", o++));
        lista.add(new ModuloDef("MOD_ASISTENCIA",       "Asistencia",          "✅", "/ventas/asistencia",  "VENTAS", o++));
        lista.add(new ModuloDef("MOD_TIPOS_ALMUERZO",   "Tipos de almuerzo",   "🍲", "/ventas/almuerzos",   "VENTAS", o++));
        lista.add(new ModuloDef("MOD_CATEGORIAS_PLATO", "Categorías de plato", "🏷️", "/ventas/categorias",  "VENTAS", o++));
        lista.add(new ModuloDef("MOD_AUDITORIA",        "Auditoría",           "📄", "/ventas/auditoria",   "VENTAS", o++));
        lista.add(new ModuloDef("MOD_REPORTES",         "Reportes",            "📊", "/ventas/reportes",    "VENTAS", o++));

        // Cocina
        lista.add(new ModuloDef("MOD_COCINA",           "Cocina",               "🍳", "/cocina/dashboard",        "COCINA", o++));
        lista.add(new ModuloDef("MOD_PEDIDOS_COCINA",   "Cola de pedidos",      "🍳", "/cocina/pedidos",          "COCINA", o++));
        lista.add(new ModuloDef("MOD_INVENTARIO",       "Inventario",           "📦", "/cocina/inventario",       "COCINA", o++));
        lista.add(new ModuloDef("MOD_PLATOS",           "Platos",               "🍽️", "/cocina/platos",           "COCINA", o++));
        lista.add(new ModuloDef("MOD_INSUMOS",          "Insumos",              "🥕", "/cocina/insumos",          "COCINA", o++));
        lista.add(new ModuloDef("MOD_CATEGORIAS_INSUMO","Categorías de insumo", "🏷️", "/cocina/categorias-insumo","COCINA", o++));
        lista.add(new ModuloDef("MOD_MODULOS",          "Módulos del sistema",  "🧩", "/cocina/modulos",          "COCINA", o++));
        lista.add(new ModuloDef("MOD_RECETAS",          "Recetas",              "📖", "/cocina/recetas",          "COCINA", o++));
        lista.add(new ModuloDef("MOD_MERMAS",           "Mermas",               "🗑️", "/cocina/mermas",           "COCINA", o++));
        lista.add(new ModuloDef("MOD_KARDEX",           "Kárdex de insumos",    "📋", "/cocina/kardex",           "COCINA", o++));
        lista.add(new ModuloDef("MOD_AUDITORIA_COCINA", "Auditoría",            "📄", "/cocina/auditoria",        "COCINA", o++));
        lista.add(new ModuloDef("MOD_PRODUCCION",       "Producción del día",   "👨‍🍳", "/cocina/produccion",      "COCINA", o++));

        return lista;
    }
}
