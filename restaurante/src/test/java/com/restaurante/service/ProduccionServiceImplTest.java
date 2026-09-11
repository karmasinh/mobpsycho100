package com.restaurante.service;

import com.restaurante.entity.*;
import com.restaurante.enums.EstadoProduccion;
import com.restaurante.enums.TipoMovimientoInventario;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.ProduccionServiceImpl;
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
class ProduccionServiceImplTest {

    @Mock private ProduccionDiaRepository produccionRepo;
    @Mock private LineaProduccionRepository lineaRepo;
    @Mock private PlatoRepository platoRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private RecetaRepository recetaRepository;
    @Mock private InventarioService inventarioService;
    @Mock private UnidadConversionService unidadConversionService;

    private ProduccionServiceImpl service;

    private Sucursal sucursal;
    private Plato plato;
    private Insumo insumo;

    @BeforeEach
    void setUp() {
        service = new ProduccionServiceImpl(produccionRepo, lineaRepo, platoRepository,
                sucursalRepository, recetaRepository, inventarioService, unidadConversionService);
        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").build();
        plato = Plato.builder().id(1L).nombre("Milanesa de pollo").build();
        insumo = Insumo.builder().id(1L).nombre("Aceite vegetal").unidadMedida("litro").build();
    }

    private LineaProduccion lineaConPlanificada(int planificada, int producidaActual) {
        return lineaEnEstado(planificada, producidaActual, EstadoProduccion.EN_CURSO);
    }

    private LineaProduccion lineaEnEstado(int planificada, int producidaActual, EstadoProduccion estadoDia) {
        ProduccionDia produccion = ProduccionDia.builder().id(1L).sucursal(sucursal).estado(estadoDia).build();
        return LineaProduccion.builder().id(1L).produccion(produccion).plato(plato)
                .cantidadPlanificada(planificada).cantidadProducida(producidaActual).build();
    }

    private Receta recetaCon(double cantidad, String unidadIngrediente) {
        RecetaIngrediente ingrediente = RecetaIngrediente.builder()
                .insumo(insumo).cantidad(cantidad).unidadMedida(unidadIngrediente).build();
        return Receta.builder().id(1L).plato(plato).activa(true).ingredientes(List.of(ingrediente)).build();
    }

    // ── Hallazgo (2026-09-10, revisión de tesis): actualizarProducida no validaba
    // el estado del día antes de descontar insumos — se podía registrar producción
    // sobre un día PLANIFICADO (aún no iniciado) o CERRADO (ya finalizado). ──

    @Test
    void actualizarProducida_rechazaSiElDiaEstaPlanificado() {
        LineaProduccion linea = lineaEnEstado(10, 0, EstadoProduccion.PLANIFICADO);
        when(lineaRepo.findById(1L)).thenReturn(Optional.of(linea));

        assertThrows(NegocioException.class, () -> service.actualizarProducida(1L, 5, 99L));
        verify(inventarioService, never()).consumirStock(any(), any(), any(), any(), any(), any());
    }

    @Test
    void actualizarProducida_rechazaSiElDiaEstaCerrado() {
        LineaProduccion linea = lineaEnEstado(10, 5, EstadoProduccion.CERRADO);
        when(lineaRepo.findById(1L)).thenReturn(Optional.of(linea));

        assertThrows(NegocioException.class, () -> service.actualizarProducida(1L, 8, 99L));
        verify(inventarioService, never()).consumirStock(any(), any(), any(), any(), any(), any());
    }

    // ── AUD-L-004: no producir más de lo planificado ────────────────

    @Test
    void actualizarProducida_rechazaSiSuperaLoPlanificado() {
        LineaProduccion linea = lineaConPlanificada(10, 0);
        when(lineaRepo.findById(1L)).thenReturn(Optional.of(linea));

        assertThrows(NegocioException.class, () -> service.actualizarProducida(1L, 11, 99L));
        verify(inventarioService, never()).consumirStock(any(), any(), any(), any(), any(), any());
    }

    // ── AUD-L-003 / BL-L-002: producción exige receta activa ────────

    @Test
    void actualizarProducida_rechazaSiElPlatoNoTieneRecetaActiva() {
        LineaProduccion linea = lineaConPlanificada(10, 0);
        when(lineaRepo.findById(1L)).thenReturn(Optional.of(linea));
        when(recetaRepository.findByPlatoIdAndActivaTrue(1L)).thenReturn(Optional.empty());

        assertThrows(NegocioException.class, () -> service.actualizarProducida(1L, 5, 99L));
    }

    // ── AUD-L-020: conversión de unidades al descontar insumos ──────

    @Test
    void actualizarProducida_convierteUnidadesAlDescontarInsumos() {
        LineaProduccion linea = lineaConPlanificada(20, 0);
        when(lineaRepo.findById(1L)).thenReturn(Optional.of(linea));
        // Receta expresa el ingrediente en ml, el insumo se maneja en litro.
        when(recetaRepository.findByPlatoIdAndActivaTrue(1L)).thenReturn(Optional.of(recetaCon(15.0, "ml")));
        when(unidadConversionService.convertir(15.0, "ml", "litro")).thenReturn(Optional.of(0.015));
        when(lineaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.actualizarProducida(1L, 10, 99L);

        // 0.015 litro/unidad * 10 producidas = 0.15 litro (no 150, que sería sin convertir)
        ArgumentCaptor<Double> cantidadCaptor = ArgumentCaptor.forClass(Double.class);
        verify(inventarioService).consumirStock(eq(1L), eq(1L), cantidadCaptor.capture(),
                any(), eq(TipoMovimientoInventario.CONSUMO_PRODUCCION), eq(99L));
        assertThat(cantidadCaptor.getValue()).isEqualTo(0.15);
    }

    @Test
    void actualizarProducida_usaLaCantidadCrudaSiNoSePuedeConvertir() {
        LineaProduccion linea = lineaConPlanificada(20, 0);
        when(lineaRepo.findById(1L)).thenReturn(Optional.of(linea));
        when(recetaRepository.findByPlatoIdAndActivaTrue(1L)).thenReturn(Optional.of(recetaCon(0.2, "litro")));
        when(unidadConversionService.convertir(0.2, "litro", "litro")).thenReturn(Optional.empty());
        when(lineaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.actualizarProducida(1L, 10, 99L);

        ArgumentCaptor<Double> cantidadCaptor = ArgumentCaptor.forClass(Double.class);
        verify(inventarioService).consumirStock(eq(1L), eq(1L), cantidadCaptor.capture(),
                any(), eq(TipoMovimientoInventario.CONSUMO_PRODUCCION), eq(99L));
        assertThat(cantidadCaptor.getValue()).isEqualTo(2.0); // 0.2 * 10, sin convertir
    }

    // ── AUD-L-005: máquina de estados de producción ─────────────────

    @Test
    void cambiarEstado_permiteLaSecuenciaValida() {
        ProduccionDia produccion = ProduccionDia.builder().id(1L).estado(EstadoProduccion.PLANIFICADO).build();
        when(produccionRepo.findById(1L)).thenReturn(Optional.of(produccion));
        when(produccionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProduccionDia actualizado = service.cambiarEstado(1L, EstadoProduccion.EN_CURSO);

        assertThat(actualizado.getEstado()).isEqualTo(EstadoProduccion.EN_CURSO);
    }

    @Test
    void cambiarEstado_rechazaSaltarDePlanificadoACerrado() {
        ProduccionDia produccion = ProduccionDia.builder().id(1L).estado(EstadoProduccion.PLANIFICADO).build();
        when(produccionRepo.findById(1L)).thenReturn(Optional.of(produccion));

        assertThrows(NegocioException.class, () -> service.cambiarEstado(1L, EstadoProduccion.CERRADO));
    }

    @Test
    void cambiarEstado_rechazaRetroceder() {
        ProduccionDia produccion = ProduccionDia.builder().id(1L).estado(EstadoProduccion.EN_CURSO).build();
        when(produccionRepo.findById(1L)).thenReturn(Optional.of(produccion));

        assertThrows(NegocioException.class, () -> service.cambiarEstado(1L, EstadoProduccion.PLANIFICADO));
    }
}
