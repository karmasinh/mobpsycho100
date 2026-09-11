package com.restaurante.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * RF-A-015 / RF-L-013: prueba real de la matriz de permisos rol → módulo.
 *
 * El mapeo de abajo es una copia intencional de
 * {@code DataInitializer.cargarRolesBase()} — no se puede invocar ese método
 * directamente sin levantar todo el contexto de Spring (es privado y escribe en
 * la BD), así que este test reproduce la asignación real. Si se agrega un módulo
 * o se cambia la asignación de un rol en {@code DataInitializer}, este test debe
 * actualizarse en el mismo cambio.
 */
@ExtendWith(MockitoExtension.class)
class PermisoMatrizTest {

    @Mock private Authentication authentication;
    @Mock private UserDetailsImpl userDetails;

    private final PermisoEvaluator permisoEvaluator = new PermisoEvaluator();

    private static final Set<String> TODOS_LOS_MODULOS = Set.of(
            // Cocina
            "MOD_COCINA", "MOD_PEDIDOS_COCINA", "MOD_PRODUCCION", "MOD_RECETAS", "MOD_PLATOS",
            "MOD_INVENTARIO", "MOD_INSUMOS", "MOD_PROVEEDORES", "MOD_ALERTAS_INV",
            "MOD_CATEGORIAS_INSUMO", "MOD_MERMAS", "MOD_KARDEX", "MOD_AUDITORIA_COCINA",
            // Ventas
            "MOD_VENTAS", "MOD_CAJA", "MOD_PEDIDOS_VENTAS", "MOD_CLIENTES", "MOD_PENSIONADOS",
            "MOD_COBROS", "MOD_ASISTENCIA", "MOD_TIPOS_ALMUERZO", "MOD_CATEGORIAS_PLATO",
            "MOD_HISTORIAL_VENTAS", "MOD_ALERTAS_VENTAS", "MOD_REPORTES", "MOD_APROBACIONES",
            "MOD_CONFIG_TICKET",
            // Admin
            "MOD_ADMIN", "MOD_EMPLEADOS", "MOD_ROLES", "MOD_USUARIOS", "MOD_SUCURSALES",
            "MOD_AUDITORIA", "MOD_ALERTAS_SISTEMA", "MOD_MODULOS"
    );

    private static final Map<String, Set<String>> MODULOS_POR_ROL = Map.ofEntries(
            Map.entry("ADMIN", TODOS_LOS_MODULOS),
            Map.entry("COCINERO", Set.of("MOD_COCINA", "MOD_PEDIDOS_COCINA", "MOD_PRODUCCION", "MOD_RECETAS",
                    "MOD_PLATOS", "MOD_INVENTARIO", "MOD_ALERTAS_INV", "MOD_CATEGORIAS_INSUMO", "MOD_MERMAS")),
            Map.entry("JEFE_COCINA", Set.of("MOD_COCINA", "MOD_PEDIDOS_COCINA", "MOD_PRODUCCION", "MOD_RECETAS",
                    "MOD_PLATOS", "MOD_INVENTARIO", "MOD_INSUMOS", "MOD_PROVEEDORES", "MOD_ALERTAS_INV",
                    "MOD_CATEGORIAS_INSUMO", "MOD_MERMAS", "MOD_KARDEX", "MOD_AUDITORIA_COCINA")),
            Map.entry("ALMACENERO", Set.of("MOD_INSUMOS", "MOD_CATEGORIAS_INSUMO", "MOD_INVENTARIO",
                    "MOD_MERMAS", "MOD_KARDEX", "MOD_PROVEEDORES", "MOD_ALERTAS_INV")),
            Map.entry("CAJERO", Set.of("MOD_VENTAS", "MOD_CAJA", "MOD_PEDIDOS_VENTAS", "MOD_CLIENTES",
                    "MOD_PENSIONADOS", "MOD_COBROS", "MOD_ASISTENCIA", "MOD_TIPOS_ALMUERZO",
                    "MOD_HISTORIAL_VENTAS", "MOD_ALERTAS_VENTAS", "MOD_APROBACIONES", "MOD_CONFIG_TICKET")),
            Map.entry("VENDEDOR", Set.of("MOD_VENTAS", "MOD_CAJA", "MOD_PEDIDOS_VENTAS", "MOD_CLIENTES",
                    "MOD_PENSIONADOS", "MOD_COBROS", "MOD_ASISTENCIA", "MOD_TIPOS_ALMUERZO",
                    "MOD_HISTORIAL_VENTAS", "MOD_ALERTAS_VENTAS", "MOD_APROBACIONES", "MOD_CONFIG_TICKET")),
            Map.entry("GERENTE_SUCURSAL", Set.of("MOD_VENTAS", "MOD_CAJA", "MOD_PEDIDOS_VENTAS", "MOD_CLIENTES",
                    "MOD_PENSIONADOS", "MOD_COBROS", "MOD_ASISTENCIA", "MOD_TIPOS_ALMUERZO", "MOD_CATEGORIAS_PLATO",
                    "MOD_HISTORIAL_VENTAS", "MOD_ALERTAS_VENTAS", "MOD_REPORTES", "MOD_EMPLEADOS",
                    "MOD_ALERTAS_SISTEMA", "MOD_APROBACIONES", "MOD_CONFIG_TICKET")),
            Map.entry("PENSIONADO", Set.of("MOD_ASISTENCIA", "MOD_COBROS"))
    );

    static Stream<Object[]> combinacionesRolModulo() {
        List<Object[]> combos = new ArrayList<>();
        for (var entry : MODULOS_POR_ROL.entrySet()) {
            for (String modulo : TODOS_LOS_MODULOS) {
                combos.add(new Object[]{entry.getKey(), modulo, entry.getValue().contains(modulo)});
            }
        }
        return combos.stream();
    }

    @ParameterizedTest(name = "{0} + {1} -> {2}")
    @MethodSource("combinacionesRolModulo")
    void tiene_respetaLaMatrizRealRolModulo(String rol, String modulo, boolean esperado) {
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getModulos()).thenReturn(new ArrayList<>(MODULOS_POR_ROL.get(rol)));

        assertThat(permisoEvaluator.tiene(authentication, modulo))
                .as("rol=%s modulo=%s", rol, modulo)
                .isEqualTo(esperado);
    }

    @Test
    void ningunModuloQuedaSinAsignarAAlgunRol() {
        // Si un módulo no está en el set de ningún rol, ninguna cuenta real
        // podría acceder nunca a esa funcionalidad, con o sin @PreAuthorize correcto.
        Set<String> modulosAsignados = new HashSet<>();
        MODULOS_POR_ROL.values().forEach(modulosAsignados::addAll);

        assertThat(modulosAsignados).containsExactlyInAnyOrderElementsOf(TODOS_LOS_MODULOS);
    }

    @Test
    void adminTieneAccesoATodosLosModulos() {
        assertThat(MODULOS_POR_ROL.get("ADMIN")).isEqualTo(TODOS_LOS_MODULOS);
    }
}
