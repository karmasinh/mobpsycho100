package com.restaurante.service;

import com.restaurante.entity.*;
import com.restaurante.enums.EstadoCierreCaja;
import com.restaurante.enums.FormaPago;
import com.restaurante.enums.TipoMovimientoCaja;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.CierreCajaServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CierreCajaServiceImplTest {

    @Mock private CierreCajaRepository cierreCajaRepository;
    @Mock private VentaRepository ventaRepository;
    @Mock private MovimientoCajaRepository movimientoCajaRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuditoriaLogRepository auditoriaLogRepository;

    private CierreCajaServiceImpl cierreCajaService;

    private Usuario cajero;
    private Sucursal sucursal;

    @BeforeEach
    void setUp() {
        cierreCajaService = new CierreCajaServiceImpl(
                cierreCajaRepository, ventaRepository, movimientoCajaRepository, sucursalRepository,
                usuarioRepository, auditoriaLogRepository);
        cajero = Usuario.builder().id(10L).username("cajero1").build();
        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").activo(true).build();
    }

    @Test
    void abrir_rechazaSegundoTurnoAbiertoParaElMismoCajero() {
        when(cierreCajaRepository.findByCajero_IdAndEstado(10L, EstadoCierreCaja.ABIERTO))
                .thenReturn(Optional.of(CierreCaja.builder().id(1L).build()));

        assertThrows(NegocioException.class, () -> cierreCajaService.abrir(1L, 100.0, 10L));
    }

    @Test
    void cerrar_calculaMontoEsperadoConVentasIngresosYRetiros() {
        LocalDateTime apertura = LocalDateTime.now().minusHours(2);
        CierreCaja turno = CierreCaja.builder()
                .id(5L)
                .sucursal(sucursal)
                .cajero(cajero)
                .fechaApertura(apertura)
                .montoInicial(100.0)
                .estado(EstadoCierreCaja.ABIERTO)
                .build();
        when(cierreCajaRepository.findById(5L)).thenReturn(Optional.of(turno));

        Venta ventaEfectivo = Venta.builder().totalCobrado(50.0).formaPago(FormaPago.EFECTIVO).build();
        when(ventaRepository.findByCajero_IdAndSucursalIdAndCreadoEnBetweenAndAnuladaFalse(
                any(), any(), any(), any())).thenReturn(List.of(ventaEfectivo));

        MovimientoCaja ingreso = MovimientoCaja.builder().tipo(TipoMovimientoCaja.INGRESO).monto(20.0).build();
        MovimientoCaja retiro = MovimientoCaja.builder().tipo(TipoMovimientoCaja.RETIRO).monto(10.0).build();
        when(movimientoCajaRepository.findByCierreCaja_IdOrderByCreadoEnAsc(5L))
                .thenReturn(List.of(ingreso, retiro));
        when(cierreCajaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CierreCaja cerrado = cierreCajaService.cerrar(5L, 160.0, "cuadre exacto", 10L);

        // 100 (inicial) + 50 (ventas efectivo) + 20 (ingreso) - 10 (retiro) = 160
        assertThat(cerrado.getMontoEsperadoEfectivo()).isEqualTo(160.0);
        assertThat(cerrado.getDiferencia()).isEqualTo(0.0);
        assertThat(cerrado.getEstado()).isEqualTo(EstadoCierreCaja.CERRADO);
    }

    @Test
    void cerrar_soloElCajeroQueAbrioElTurnoPuedeCerrarlo() {
        CierreCaja turno = CierreCaja.builder()
                .id(5L).sucursal(sucursal).cajero(cajero)
                .fechaApertura(LocalDateTime.now())
                .montoInicial(100.0).estado(EstadoCierreCaja.ABIERTO)
                .build();
        when(cierreCajaRepository.findById(5L)).thenReturn(Optional.of(turno));

        assertThrows(NegocioException.class, () -> cierreCajaService.cerrar(5L, 100.0, null, 99L));
    }

    // ── revertirMovimiento ───────────────────────────────────────────

    private CierreCaja turnoAbierto(Long id) {
        return CierreCaja.builder().id(id).sucursal(sucursal).cajero(cajero)
                .fechaApertura(LocalDateTime.now()).montoInicial(100.0)
                .estado(EstadoCierreCaja.ABIERTO).build();
    }

    @Test
    void revertirMovimiento_rechazaMotivoVacio() {
        assertThrows(NegocioException.class, () -> cierreCajaService.revertirMovimiento(50L, "  ", 1L));
        assertThrows(NegocioException.class, () -> cierreCajaService.revertirMovimiento(50L, null, 1L));
    }

    @Test
    void revertirMovimiento_creaMovimientoInversoConReferenciaAlOriginal() {
        CierreCaja turno = turnoAbierto(5L);
        MovimientoCaja original = MovimientoCaja.builder()
                .id(50L).cierreCaja(turno).tipo(TipoMovimientoCaja.RETIRO).monto(30.0).motivo("Compra insumos").build();
        when(movimientoCajaRepository.findById(50L)).thenReturn(Optional.of(original));
        when(movimientoCajaRepository.existsByRevierteId(50L)).thenReturn(false);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(Usuario.builder().id(1L).username("admin").build()));
        when(movimientoCajaRepository.save(any())).thenAnswer(inv -> {
            MovimientoCaja m = inv.getArgument(0);
            m.setId(51L);
            return m;
        });

        MovimientoCaja reversion = cierreCajaService.revertirMovimiento(50L, "Registrado por error", 1L);

        assertThat(reversion.getTipo()).isEqualTo(TipoMovimientoCaja.INGRESO);
        assertThat(reversion.getMonto()).isEqualTo(30.0);
        assertThat(reversion.getRevierteId()).isEqualTo(50L);
    }

    @Test
    void revertirMovimiento_rechazaSiElTurnoYaEstaCerrado() {
        CierreCaja turnoCerrado = CierreCaja.builder().id(5L).estado(EstadoCierreCaja.CERRADO).build();
        MovimientoCaja original = MovimientoCaja.builder().id(50L).cierreCaja(turnoCerrado)
                .tipo(TipoMovimientoCaja.INGRESO).monto(30.0).build();
        when(movimientoCajaRepository.findById(50L)).thenReturn(Optional.of(original));

        assertThrows(NegocioException.class, () -> cierreCajaService.revertirMovimiento(50L, "motivo", 1L));
    }

    @Test
    void revertirMovimiento_rechazaSiYaFueRevertidoAntes() {
        CierreCaja turno = turnoAbierto(5L);
        MovimientoCaja original = MovimientoCaja.builder().id(50L).cierreCaja(turno)
                .tipo(TipoMovimientoCaja.INGRESO).monto(30.0).build();
        when(movimientoCajaRepository.findById(50L)).thenReturn(Optional.of(original));
        when(movimientoCajaRepository.existsByRevierteId(50L)).thenReturn(true);

        assertThrows(NegocioException.class, () -> cierreCajaService.revertirMovimiento(50L, "motivo", 1L));
    }

    @Test
    void revertirMovimiento_rechazaRevertirUnaReversion() {
        CierreCaja turno = turnoAbierto(5L);
        MovimientoCaja reversionExistente = MovimientoCaja.builder().id(51L).cierreCaja(turno)
                .tipo(TipoMovimientoCaja.INGRESO).monto(30.0).revierteId(50L).build();
        when(movimientoCajaRepository.findById(51L)).thenReturn(Optional.of(reversionExistente));

        assertThrows(NegocioException.class, () -> cierreCajaService.revertirMovimiento(51L, "motivo", 1L));
    }
}
