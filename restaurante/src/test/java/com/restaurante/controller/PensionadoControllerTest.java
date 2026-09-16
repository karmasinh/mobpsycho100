package com.restaurante.controller;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;
import com.restaurante.entity.Sucursal;
import com.restaurante.enums.FormaPago;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.PensionadoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Aislamiento cruzado por sucursal en PensionadoController (AUD-A-020/AUD-A-037):
 * un usuario con sucursal fija no debe poder operar por ID sobre un pensionado
 * de otra sucursal, en ninguno de los endpoints que exponen operaciones por ID
 * (obtener, baja, reactivar, asistencia, cobros).
 */
@ExtendWith(MockitoExtension.class)
class PensionadoControllerTest {

    @Mock private PensionadoService pensionadoService;
    @Mock private UserDetailsImpl user;

    // SucursalAccessService no es un mock: se usa la implementación real para
    // ejercitar el comportamiento efectivo, igual que en el resto de los
    // controllers de dominio (PedidoController/VentaController/ProduccionController).
    private final SucursalAccessService sucursalAccessService = new SucursalAccessService();

    private static final Long SUCURSAL_PROPIA = 1L;
    private static final Long SUCURSAL_AJENA = 2L;
    private static final Long PENSIONADO_ID = 10L;

    private Pensionado pensionadoDeSucursal(Long sucursalId) {
        return Pensionado.builder().id(PENSIONADO_ID).sucursal(Sucursal.builder().id(sucursalId).build()).build();
    }

    private PensionadoController controller() {
        return new PensionadoController(pensionadoService, sucursalAccessService);
    }

    private void usuarioConSucursal(Long sucursalId) {
        when(user.getSucursalId()).thenReturn(sucursalId);
    }

    // ─── obtener ───────────────────────────────────────────────────

    @Test
    void obtener_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.obtener(PENSIONADO_ID, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void obtener_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThat(ctrl.obtener(PENSIONADO_ID, user).getBody()).isNotNull();
    }

    // ─── baja ──────────────────────────────────────────────────────

    @Test
    void baja_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.baja(PENSIONADO_ID, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void baja_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatCode(() -> ctrl.baja(PENSIONADO_ID, user)).doesNotThrowAnyException();
    }

    // ─── reactivar ─────────────────────────────────────────────────

    @Test
    void reactivar_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.reactivar(PENSIONADO_ID, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void reactivar_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatCode(() -> ctrl.reactivar(PENSIONADO_ID, user)).doesNotThrowAnyException();
    }

    // ─── registrarAsistencia ───────────────────────────────────────

    @Test
    void registrarAsistencia_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.registrarAsistencia(PENSIONADO_ID, LocalDate.now(), user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void registrarAsistencia_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);
        when(user.getId()).thenReturn(100L);
        LocalDate fecha = LocalDate.now();
        when(pensionadoService.registrarAsistencia(PENSIONADO_ID, fecha, 100L))
                .thenReturn(AsistenciaPensionado.builder().id(1L).build());

        assertThat(ctrl.registrarAsistencia(PENSIONADO_ID, fecha, user).getBody()).isNotNull();
    }

    // ─── listarAsistencias ─────────────────────────────────────────

    @Test
    void listarAsistencias_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.listarAsistencias(PENSIONADO_ID, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void listarAsistencias_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThat(ctrl.listarAsistencias(PENSIONADO_ID, user).getBody()).isNotNull();
    }

    // ─── generarCobro ──────────────────────────────────────────────

    @Test
    void generarCobro_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.generarCobro(PENSIONADO_ID, 9, 2026, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void generarCobro_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);
        when(pensionadoService.generarCobroMensual(PENSIONADO_ID, 9, 2026))
                .thenReturn(CobroMensual.builder().id(1L).build());

        assertThat(ctrl.generarCobro(PENSIONADO_ID, 9, 2026, user).getBody()).isNotNull();
    }

    // ─── listarCobros ──────────────────────────────────────────────

    @Test
    void listarCobros_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.listarCobros(PENSIONADO_ID, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void listarCobros_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThat(ctrl.listarCobros(PENSIONADO_ID, user).getBody()).isNotNull();
    }

    // ─── registrarPago ─────────────────────────────────────────────

    private CobroMensualRequest cobroRequest() {
        CobroMensualRequest request = new CobroMensualRequest();
        request.setPensionadoId(PENSIONADO_ID);
        request.setMes(9);
        request.setAnio(2026);
        request.setMontoPagado(150.0);
        request.setFormaPago(FormaPago.EFECTIVO);
        return request;
    }

    @Test
    void registrarPago_rechazaPensionadoDeOtraSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(SUCURSAL_PROPIA);

        assertThatThrownBy(() -> ctrl.registrarPago(cobroRequest(), user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void registrarPago_permitePensionadoDeLaMismaSucursal() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_PROPIA));
        usuarioConSucursal(SUCURSAL_PROPIA);
        when(user.getId()).thenReturn(100L);
        CobroMensualRequest request = cobroRequest();
        when(pensionadoService.registrarPago(request, 100L)).thenReturn(CobroMensual.builder().id(1L).build());

        assertThat(ctrl.registrarPago(request, user).getBody()).isNotNull();
    }

    // ─── usuario sin sucursal fija (ADMIN) ──────────────────────────

    @Test
    void obtener_permiteCualquierSucursalParaUsuarioSinSucursalFija() {
        PensionadoController ctrl = controller();
        when(pensionadoService.obtenerPorId(PENSIONADO_ID)).thenReturn(pensionadoDeSucursal(SUCURSAL_AJENA));
        usuarioConSucursal(null);

        assertThat(ctrl.obtener(PENSIONADO_ID, user).getBody()).isNotNull();
    }
}
