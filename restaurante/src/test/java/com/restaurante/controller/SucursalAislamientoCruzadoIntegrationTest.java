package com.restaurante.controller;

import com.restaurante.config.SecurityConfig;
import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Empleado;
import com.restaurante.entity.Pedido;
import com.restaurante.entity.Pensionado;
import com.restaurante.entity.ProduccionDia;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Usuario;
import com.restaurante.entity.Venta;
import com.restaurante.enums.EstadoPedido;
import com.restaurante.enums.EstadoEmpleado;
import com.restaurante.enums.FormaPago;
import com.restaurante.enums.TurnoEmpleado;
import com.restaurante.security.PermisoEvaluator;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.security.UserDetailsServiceImpl;
import com.restaurante.security.filters.JwtAuthenticationFilter;
import com.restaurante.security.jwt.JwtUtils;
import com.restaurante.service.PedidoService;
import com.restaurante.service.PensionadoService;
import com.restaurante.service.ProduccionService;
import com.restaurante.service.VentaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AUD-A-020 / AUD-L-006: evidencia de aislamiento cruzado por sucursal end-to-end
 * (filtro de seguridad real + {@code @PreAuthorize} real + {@code SucursalAccessService}
 * real), con dos usuarios REALES cada uno fijo a una sucursal distinta —
 * {@code cajero1}/Casa Matriz (id=1) y {@code cajero2}/Sucursal Sur (id=2), el mismo
 * par usado como dato de referencia en el backlog de ambos proyectos
 * (10_BACKLOG_Y_CAMBIOS.md, "Sucursal Sur ... cajero2/vendedor2").
 *
 * <p>A diferencia de {@code PedidoControllerTest}/{@code VentaControllerTest}/
 * {@code ProduccionControllerTest}/{@code PensionadoControllerTest} (unit tests que
 * invocan el controller directamente con un {@code UserDetailsImpl} mockeado), esta
 * clase pasa por {@code MockMvc} con la cadena de filtros y la expresión SpEL de
 * {@code @PreAuthorize} tal como está escrita en cada controller, usando un
 * {@code UserDetailsImpl} construido desde una entidad {@code Usuario} real con
 * {@code Empleado.sucursal} fija — cierra la brecha señalada explícitamente en el
 * backlog ("pruebas de aislamiento cruzado con usuarios reales de dos sucursales
 * distintas... AUD-A-020/AUD-L-006 sigue abierto hasta esa evidencia").
 */
@WebMvcTest(controllers = {
        PedidoController.class,
        VentaController.class,
        ProduccionController.class,
        PensionadoController.class
})
@Import({SecurityConfig.class, PermisoEvaluator.class, SucursalAccessService.class,
        SucursalAislamientoCruzadoIntegrationTest.TestBeans.class})
class SucursalAislamientoCruzadoIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private PedidoService pedidoService;
    @MockBean private VentaService ventaService;
    @MockBean private ProduccionService produccionService;
    @MockBean private PensionadoService pensionadoService;

    private static final Long SUCURSAL_1 = 1L;
    private static final Long SUCURSAL_2 = 2L;
    private static final Long RECURSO_ID = 10L;

    @TestConfiguration
    static class TestBeans {
        @Bean
        JwtUtils jwtUtils() {
            return mock(JwtUtils.class);
        }

        @Bean
        UserDetailsServiceImpl userDetailsService() {
            return mock(UserDetailsServiceImpl.class);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(JwtUtils jwtUtils, UserDetailsServiceImpl uds) {
            return new JwtAuthenticationFilter(jwtUtils, uds);
        }
    }

    // ─── Usuarios reales fijos a sucursales distintas ───────────────

    private UsernamePasswordAuthenticationToken usuarioDe(Long sucursalId, String rolNombre) {
        Sucursal sucursal = Sucursal.builder().id(sucursalId).nombre("Sucursal " + sucursalId).build();
        Empleado empleado = Empleado.builder().id(sucursalId * 100)
                .nombre("Cajero").apellido("Sucursal" + sucursalId).ci("CI" + sucursalId)
                .cargo(rolNombre).turno(TurnoEmpleado.MANANA).fechaIngreso(LocalDate.now())
                .estado(EstadoEmpleado.ACTIVO).sucursal(sucursal).build();
        Rol rol = Rol.builder().id(1L).nombre(rolNombre).activo(true).build();
        Usuario usuario = Usuario.builder().id(sucursalId).username("cajero" + sucursalId)
                .passwordHash("x").rol(rol).empleado(empleado).activo(true).build();
        UserDetailsImpl userDetails = new UserDetailsImpl(usuario);
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    private UsernamePasswordAuthenticationToken cajeroSucursal1() { return usuarioDe(SUCURSAL_1, "CAJERO"); }
    private UsernamePasswordAuthenticationToken cajeroSucursal2() { return usuarioDe(SUCURSAL_2, "CAJERO"); }
    private UsernamePasswordAuthenticationToken cocineroSucursal1() { return usuarioDe(SUCURSAL_1, "COCINERO"); }

    // ─── PedidoController ────────────────────────────────────────────

    @Test
    void pedidos_obtener_usuarioDeSucursal1_recibe403SobrePedidoDeSucursal2() throws Exception {
        when(pedidoService.obtenerPorId(RECURSO_ID))
                .thenReturn(Pedido.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_2).build()).build());

        mockMvc.perform(get("/pedidos/{id}", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pedidos_obtener_usuarioDeSucursal1_recibe200SobrePedidoPropio() throws Exception {
        when(pedidoService.obtenerPorId(RECURSO_ID))
                .thenReturn(Pedido.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_1).build()).build());

        mockMvc.perform(get("/pedidos/{id}", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isOk());
    }

    @Test
    void pedidos_cambiarEstado_usuarioDeSucursal1_recibe403SobrePedidoDeSucursal2() throws Exception {
        when(pedidoService.obtenerPorId(RECURSO_ID))
                .thenReturn(Pedido.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_2).build()).build());

        mockMvc.perform(patch("/pedidos/{id}/estado", RECURSO_ID)
                        .param("nuevoEstado", EstadoPedido.EN_PREPARACION.name())
                        .with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    // ─── VentaController ─────────────────────────────────────────────

    @Test
    void ventas_obtener_usuarioDeSucursal1_recibe403SobreVentaDeSucursal2() throws Exception {
        when(ventaService.obtenerPorId(RECURSO_ID))
                .thenReturn(Venta.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_2).build()).build());

        mockMvc.perform(get("/ventas/{id}", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void ventas_obtener_usuarioDeSucursal1_recibe200SobreVentaPropia() throws Exception {
        when(ventaService.obtenerPorId(RECURSO_ID))
                .thenReturn(Venta.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_1).build()).build());

        mockMvc.perform(get("/ventas/{id}", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isOk());
    }

    // ─── ProduccionController ─────────────────────────────────────────

    @Test
    void produccion_obtener_usuarioDeSucursal1_recibe403SobreProduccionDeSucursal2() throws Exception {
        when(produccionService.obtenerPorId(RECURSO_ID))
                .thenReturn(ProduccionDia.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_2).build()).build());

        mockMvc.perform(get("/produccion/{id}", RECURSO_ID).with(authentication(cocineroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void produccion_obtener_usuarioDeSucursal1_recibe200SobreProduccionPropia() throws Exception {
        when(produccionService.obtenerPorId(RECURSO_ID))
                .thenReturn(ProduccionDia.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(SUCURSAL_1).build()).build());

        mockMvc.perform(get("/produccion/{id}", RECURSO_ID).with(authentication(cocineroSucursal1())))
                .andExpect(status().isOk());
    }

    // ─── PensionadoController ────────────────────────────────────────

    private Pensionado pensionadoDeSucursal(Long sucursalId) {
        return Pensionado.builder().id(RECURSO_ID).sucursal(Sucursal.builder().id(sucursalId).build()).build();
    }

    @Test
    void pensionados_obtener_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(get("/pensionados/{id}", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_obtener_usuarioDeSucursal1_recibe200SobrePensionadoPropio() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_1));

        mockMvc.perform(get("/pensionados/{id}", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isOk());
    }

    @Test
    void pensionados_baja_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(patch("/pensionados/{id}/baja", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_reactivar_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(patch("/pensionados/{id}/reactivar", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_registrarAsistencia_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(post("/pensionados/{id}/asistencia", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_registrarAsistencia_usuarioDeSucursal1_recibe201SobrePensionadoPropio() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_1));
        when(pensionadoService.registrarAsistencia(org.mockito.ArgumentMatchers.eq(RECURSO_ID),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong()))
                .thenReturn(AsistenciaPensionado.builder().id(1L).build());

        mockMvc.perform(post("/pensionados/{id}/asistencia", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isCreated());
    }

    @Test
    void pensionados_listarAsistencias_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(get("/pensionados/{id}/asistencia", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_generarCobro_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(post("/pensionados/{id}/cobro/generar", RECURSO_ID)
                        .param("mes", "9").param("anio", "2026")
                        .with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_listarCobros_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(get("/pensionados/{id}/cobros", RECURSO_ID).with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_registrarPago_usuarioDeSucursal1_recibe403SobrePensionadoDeSucursal2() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));
        CobroMensualRequest body = new CobroMensualRequest();
        body.setPensionadoId(RECURSO_ID);
        body.setMes(9);
        body.setAnio(2026);
        body.setMontoPagado(150.0);
        body.setFormaPago(FormaPago.EFECTIVO);

        mockMvc.perform(post("/pensionados/cobro/pagar")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(new com.fasterxml.jackson.databind.ObjectMapper()
                                .findAndRegisterModules().writeValueAsString(body))
                        .with(authentication(cajeroSucursal1())))
                .andExpect(status().isForbidden());
    }

    // ─── Confirmación positiva cruzada: sucursal 2 sobre su propio recurso ──

    @Test
    void pensionados_obtener_usuarioDeSucursal2_recibe403SobrePensionadoDeSucursal1() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_1));

        mockMvc.perform(get("/pensionados/{id}", RECURSO_ID).with(authentication(cajeroSucursal2())))
                .andExpect(status().isForbidden());
    }

    @Test
    void pensionados_obtener_usuarioDeSucursal2_recibe200SobrePensionadoPropio() throws Exception {
        when(pensionadoService.obtenerPorId(RECURSO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_2));

        mockMvc.perform(get("/pensionados/{id}", RECURSO_ID).with(authentication(cajeroSucursal2())))
                .andExpect(status().isOk());
    }
}
