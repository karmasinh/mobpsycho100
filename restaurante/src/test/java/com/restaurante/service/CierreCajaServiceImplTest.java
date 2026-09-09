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

    private CierreCajaServiceImpl cierreCajaService;

    private Usuario cajero;
    private Sucursal sucursal;

    @BeforeEach
    void setUp() {
        cierreCajaService = new CierreCajaServiceImpl(
                cierreCajaRepository, ventaRepository, movimientoCajaRepository, sucursalRepository, usuarioRepository);
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
}
