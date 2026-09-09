package com.restaurante.service;

import com.restaurante.entity.*;
import com.restaurante.enums.TipoMovimientoInventario;
import com.restaurante.exception.StockInsuficienteException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.InventarioServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventarioServiceImplTest {

    @Mock private InsumoRepository insumoRepository;
    @Mock private LoteInsumoRepository loteInsumoRepository;
    @Mock private MovimientoInventarioRepository movimientoInventarioRepository;
    @Mock private StockInsumoRepository stockInsumoRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private ProveedorRepository proveedorRepository;
    @Mock private UsuarioRepository usuarioRepository;

    private InventarioServiceImpl inventarioService;

    private Insumo insumo;
    private Sucursal sucursalA;
    private Sucursal sucursalB;

    @BeforeEach
    void setUp() {
        inventarioService = new InventarioServiceImpl(
                insumoRepository, loteInsumoRepository, movimientoInventarioRepository,
                stockInsumoRepository, sucursalRepository, proveedorRepository, usuarioRepository);

        insumo = Insumo.builder().id(1L).codigo("INS-1").nombre("Arroz").unidadMedida("Kg")
                .precioUnitario(10.0).activo(true).build();
        sucursalA = Sucursal.builder().id(1L).nombre("Sucursal A").activo(true).build();
        sucursalB = Sucursal.builder().id(2L).nombre("Sucursal B").activo(true).build();

        when(insumoRepository.findById(1L)).thenReturn(Optional.of(insumo));
        when(sucursalRepository.findById(1L)).thenReturn(Optional.of(sucursalA));
    }

    @Test
    void ingresarLote_calculaPromedioPonderadoGlobal() {
        StockInsumo stockA = StockInsumo.builder().insumo(insumo).sucursal(sucursalA).stockActual(100.0).stockMinimo(0.0).build();
        when(stockInsumoRepository.findByInsumo_IdAndSucursal_Id(1L, 1L)).thenReturn(Optional.of(stockA));
        when(stockInsumoRepository.sumStockGlobal(1L)).thenReturn(100.0);

        inventarioService.ingresarLote(1L, 1L, null, null, 50.0, 16.0, null, null);

        // (100*10 + 50*16) / 150 = 12.0
        assertThat(insumo.getPrecioUnitario()).isEqualTo(12.0);
        assertThat(stockA.getStockActual()).isEqualTo(150.0);
    }

    @Test
    void consumirStock_descuentaFEFOYActualizaStock() {
        StockInsumo stockA = StockInsumo.builder().insumo(insumo).sucursal(sucursalA).stockActual(20.0).stockMinimo(0.0).build();
        when(stockInsumoRepository.findByInsumo_IdAndSucursal_Id(1L, 1L)).thenReturn(Optional.of(stockA));

        LoteInsumo loteViejo = LoteInsumo.builder().id(1L).insumo(insumo).sucursal(sucursalA)
                .cantidadDisponible(10.0).activo(true).build();
        LoteInsumo loteNuevo = LoteInsumo.builder().id(2L).insumo(insumo).sucursal(sucursalA)
                .cantidadDisponible(10.0).activo(true).build();
        when(loteInsumoRepository.findLotesFEFO(1L, 1L)).thenReturn(List.of(loteViejo, loteNuevo));

        inventarioService.consumirStock(1L, 1L, 15.0, "Consumo test", TipoMovimientoInventario.CONSUMO_PRODUCCION, null);

        assertThat(loteViejo.getCantidadDisponible()).isEqualTo(0.0);
        assertThat(loteViejo.getActivo()).isFalse();
        assertThat(loteNuevo.getCantidadDisponible()).isEqualTo(5.0);
        assertThat(stockA.getStockActual()).isEqualTo(5.0);

        ArgumentCaptor<MovimientoInventario> captor = ArgumentCaptor.forClass(MovimientoInventario.class);
        verify(movimientoInventarioRepository).save(captor.capture());
        assertThat(captor.getValue().getSucursal()).isEqualTo(sucursalA);
        assertThat(captor.getValue().getCantidad()).isEqualTo(15.0);
    }

    @Test
    void consumirStock_lanzaExcepcionSiNoAlcanzaElStock() {
        StockInsumo stockA = StockInsumo.builder().insumo(insumo).sucursal(sucursalA).stockActual(5.0).stockMinimo(0.0).build();
        when(stockInsumoRepository.findByInsumo_IdAndSucursal_Id(1L, 1L)).thenReturn(Optional.of(stockA));

        assertThrows(StockInsuficienteException.class, () ->
                inventarioService.consumirStock(1L, 1L, 10.0, "motivo", TipoMovimientoInventario.CONSUMO_PRODUCCION, null));

        verify(movimientoInventarioRepository, never()).save(any());
    }

    @Test
    void consumirStock_noAfectaElStockDeOtraSucursal() {
        StockInsumo stockA = StockInsumo.builder().insumo(insumo).sucursal(sucursalA).stockActual(20.0).stockMinimo(0.0).build();
        StockInsumo stockB = StockInsumo.builder().insumo(insumo).sucursal(sucursalB).stockActual(5.0).stockMinimo(0.0).build();
        when(stockInsumoRepository.findByInsumo_IdAndSucursal_Id(1L, 1L)).thenReturn(Optional.of(stockA));
        when(loteInsumoRepository.findLotesFEFO(1L, 1L)).thenReturn(List.of());

        inventarioService.consumirStock(1L, 1L, 10.0, "motivo", TipoMovimientoInventario.CONSUMO_PRODUCCION, null);

        assertThat(stockA.getStockActual()).isEqualTo(10.0);
        assertThat(stockB.getStockActual()).isEqualTo(5.0);
        verify(stockInsumoRepository, never()).findByInsumo_IdAndSucursal_Id(1L, 2L);
    }
}
