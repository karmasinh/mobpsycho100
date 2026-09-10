package com.restaurante.service;

import com.restaurante.entity.*;
import com.restaurante.enums.EstadoSolicitud;
import com.restaurante.enums.TipoSolicitud;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.SolicitudAprobacionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SolicitudAprobacionServiceImplTest {

    @Mock private SolicitudAprobacionRepository solicitudRepository;
    @Mock private VentaRepository ventaRepository;
    @Mock private MovimientoCajaRepository movimientoCajaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AlertaSistemaRepository alertaSistemaRepository;
    @Mock private VentaService ventaService;
    @Mock private CierreCajaService cierreCajaService;

    private SolicitudAprobacionServiceImpl service;

    private Sucursal sucursal;
    private Usuario cajero;
    private Usuario admin;

    @BeforeEach
    void setUp() {
        service = new SolicitudAprobacionServiceImpl(solicitudRepository, ventaRepository,
                movimientoCajaRepository, usuarioRepository, alertaSistemaRepository,
                ventaService, cierreCajaService);
        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").build();
        cajero = Usuario.builder().id(10L).username("cajero1").build();
        admin = Usuario.builder().id(1L).username("admin").build();
        lenient().when(solicitudRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── solicitar ─────────────────────────────────────────────────

    @Test
    void solicitar_rechazaMotivoVacio() {
        assertThrows(NegocioException.class,
                () -> service.solicitar(TipoSolicitud.ANULACION_VENTA, 500L, "  ", 10L));
        verify(ventaRepository, never()).findById(any());
    }

    @Test
    void solicitar_resuelveLaSucursalDesdeLaVenta() {
        Venta venta = Venta.builder().id(500L).sucursal(sucursal).build();
        when(ventaRepository.findById(500L)).thenReturn(Optional.of(venta));
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));

        SolicitudAprobacion solicitud = service.solicitar(TipoSolicitud.ANULACION_VENTA, 500L, "Cliente se arrepintió", 10L);

        assertThat(solicitud.getSucursal()).isEqualTo(sucursal);
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitud.PENDIENTE);
        verify(alertaSistemaRepository).save(any());
    }

    @Test
    void solicitar_resuelveLaSucursalDesdeElMovimientoDeCaja() {
        CierreCaja turno = CierreCaja.builder().id(5L).sucursal(sucursal).build();
        MovimientoCaja movimiento = MovimientoCaja.builder().id(50L).cierreCaja(turno).build();
        when(movimientoCajaRepository.findById(50L)).thenReturn(Optional.of(movimiento));
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));

        SolicitudAprobacion solicitud = service.solicitar(
                TipoSolicitud.REVERSION_MOVIMIENTO_CAJA, 50L, "Registrado por error", 10L);

        assertThat(solicitud.getSucursal()).isEqualTo(sucursal);
    }

    // ── aprobar ───────────────────────────────────────────────────

    @Test
    void aprobar_ejecutaLaAnulacionRealYQuedaAprobada() {
        SolicitudAprobacion solicitud = SolicitudAprobacion.builder()
                .id(1L).tipo(TipoSolicitud.ANULACION_VENTA).entidadId(500L)
                .motivo("Cliente se arrepintió").estado(EstadoSolicitud.PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));

        SolicitudAprobacion resultado = service.aprobar(1L, 1L);

        verify(ventaService).anular(500L, "Cliente se arrepintió", 1L);
        verify(cierreCajaService, never()).revertirMovimiento(any(), any(), any());
        assertThat(resultado.getEstado()).isEqualTo(EstadoSolicitud.APROBADA);
        assertThat(resultado.getResueltoPor()).isEqualTo(admin);
    }

    @Test
    void aprobar_ejecutaLaReversionRealDeMovimientoDeCaja() {
        SolicitudAprobacion solicitud = SolicitudAprobacion.builder()
                .id(2L).tipo(TipoSolicitud.REVERSION_MOVIMIENTO_CAJA).entidadId(50L)
                .motivo("Registrado por error").estado(EstadoSolicitud.PENDIENTE).build();
        when(solicitudRepository.findById(2L)).thenReturn(Optional.of(solicitud));
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));

        service.aprobar(2L, 1L);

        verify(cierreCajaService).revertirMovimiento(50L, "Registrado por error", 1L);
        verify(ventaService, never()).anular(any(), any(), any());
    }

    @Test
    void aprobar_rechazaSolicitudYaResuelta() {
        SolicitudAprobacion solicitud = SolicitudAprobacion.builder()
                .id(1L).tipo(TipoSolicitud.ANULACION_VENTA).entidadId(500L)
                .estado(EstadoSolicitud.APROBADA).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(NegocioException.class, () -> service.aprobar(1L, 1L));
        verify(ventaService, never()).anular(any(), any(), any());
    }

    @Test
    void aprobar_siLaAccionRealFallaLaSolicitudNoQuedaAprobada() {
        SolicitudAprobacion solicitud = SolicitudAprobacion.builder()
                .id(1L).tipo(TipoSolicitud.ANULACION_VENTA).entidadId(500L)
                .motivo("motivo").estado(EstadoSolicitud.PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        doThrow(new NegocioException("La venta #500 ya está anulada."))
                .when(ventaService).anular(500L, "motivo", 1L);

        assertThrows(NegocioException.class, () -> service.aprobar(1L, 1L));
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitud.PENDIENTE);
    }

    // ── rechazar ──────────────────────────────────────────────────

    @Test
    void rechazar_noEjecutaNingunaAccionReal() {
        SolicitudAprobacion solicitud = SolicitudAprobacion.builder()
                .id(1L).tipo(TipoSolicitud.ANULACION_VENTA).entidadId(500L)
                .estado(EstadoSolicitud.PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));

        SolicitudAprobacion resultado = service.rechazar(1L, "No corresponde", 1L);

        assertThat(resultado.getEstado()).isEqualTo(EstadoSolicitud.RECHAZADA);
        assertThat(resultado.getMotivoRechazo()).isEqualTo("No corresponde");
        verify(ventaService, never()).anular(any(), any(), any());
        verify(cierreCajaService, never()).revertirMovimiento(any(), any(), any());
    }

    @Test
    void rechazar_exigeMotivo() {
        assertThrows(NegocioException.class, () -> service.rechazar(1L, "  ", 1L));
        verify(solicitudRepository, never()).findById(any());
    }
}
