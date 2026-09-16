package com.restaurante.service;

import com.restaurante.dto.request.AvanzarEstadoSolicitudCompraRequest;
import com.restaurante.dto.request.CrearSolicitudCompraRequest;
import com.restaurante.entity.*;
import com.restaurante.enums.EstadoSolicitudCompra;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.SolicitudCompraServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SolicitudCompraServiceImplTest {

    @Mock private SolicitudCompraRepository solicitudCompraRepository;
    @Mock private ProveedorRepository proveedorRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private InsumoRepository insumoRepository;
    @Mock private AlertaSistemaRepository alertaSistemaRepository;
    @Mock private InventarioService inventarioService;

    private SolicitudCompraServiceImpl service;

    private Sucursal sucursal;
    private Usuario solicitante;
    private Proveedor proveedor;
    private Insumo insumo;

    @BeforeEach
    void setUp() {
        service = new SolicitudCompraServiceImpl(solicitudCompraRepository, proveedorRepository,
                sucursalRepository, usuarioRepository, insumoRepository, alertaSistemaRepository,
                inventarioService);

        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").build();
        solicitante = Usuario.builder().id(10L).username("almacenero1").build();
        proveedor = Proveedor.builder().id(5L).nombre("Distribuidora ABC").build();
        insumo = Insumo.builder().id(7L).codigo("INS-7").nombre("Arroz").unidadMedida("Kg")
                .precioUnitario(8.0).build();

        lenient().when(solicitudCompraRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(sucursalRepository.findById(1L)).thenReturn(Optional.of(sucursal));
        lenient().when(usuarioRepository.findById(10L)).thenReturn(Optional.of(solicitante));
        lenient().when(proveedorRepository.findById(5L)).thenReturn(Optional.of(proveedor));
        lenient().when(insumoRepository.findById(7L)).thenReturn(Optional.of(insumo));
    }

    // ── crear ────────────────────────────────────────────────────

    @Test
    void crear_rechazaSolicitudSinItems() {
        CrearSolicitudCompraRequest request = new CrearSolicitudCompraRequest();
        request.setProveedorId(5L);
        request.setItems(List.of());

        assertThrows(NegocioException.class, () -> service.crear(request, 1L, 10L));
        verify(solicitudCompraRepository, never()).save(any());
    }

    @Test
    void crear_generaAlertaYQuedaEnCreada() {
        CrearSolicitudCompraRequest.ItemRequest item = new CrearSolicitudCompraRequest.ItemRequest();
        item.setInsumoId(7L);
        item.setCantidadSolicitada(20.0);
        CrearSolicitudCompraRequest request = new CrearSolicitudCompraRequest();
        request.setProveedorId(5L);
        request.setItems(List.of(item));

        SolicitudCompra solicitud = service.crear(request, 1L, 10L);

        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudCompra.CREADA);
        assertThat(solicitud.getItems()).hasSize(1);
        verify(alertaSistemaRepository).save(any());
    }

    // ── avanzarEstado: secuencia completa hasta RECIBIDA ────────────

    @Test
    void avanzarEstado_secuenciaCompletaHastaRecibidaIngresaLotePorItem() {
        SolicitudCompraItem item = SolicitudCompraItem.builder()
                .id(100L).insumo(insumo).cantidadSolicitada(20.0).build();
        SolicitudCompra solicitud = SolicitudCompra.builder()
                .id(1L).proveedor(proveedor).sucursal(sucursal)
                .estado(EstadoSolicitudCompra.CREADA)
                .items(new java.util.ArrayList<>(List.of(item)))
                .build();
        item.setSolicitudCompra(solicitud);
        when(solicitudCompraRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        service.avanzarEstado(1L, EstadoSolicitudCompra.EN_REVISION, null, 10L);
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudCompra.EN_REVISION);

        service.avanzarEstado(1L, EstadoSolicitudCompra.APROBADA, null, 1L);
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudCompra.APROBADA);

        service.avanzarEstado(1L, EstadoSolicitudCompra.EN_PROCESO, null, 10L);
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudCompra.EN_PROCESO);

        AvanzarEstadoSolicitudCompraRequest.ItemRecepcionRequest itemRecepcion =
                new AvanzarEstadoSolicitudCompraRequest.ItemRecepcionRequest();
        itemRecepcion.setItemId(100L);
        itemRecepcion.setNumeroLote("LOTE-X");
        itemRecepcion.setPrecioUnitario(9.0);
        itemRecepcion.setFechaVencimiento(LocalDate.now().plusMonths(6));
        AvanzarEstadoSolicitudCompraRequest recepcion = new AvanzarEstadoSolicitudCompraRequest();
        recepcion.setEstado(EstadoSolicitudCompra.RECIBIDA);
        recepcion.setItems(List.of(itemRecepcion));

        SolicitudCompra resultado = service.avanzarEstado(1L, EstadoSolicitudCompra.RECIBIDA, recepcion, 10L);

        assertThat(resultado.getEstado()).isEqualTo(EstadoSolicitudCompra.RECIBIDA);
        assertThat(resultado.getFechaRecepcion()).isNotNull();
        verify(inventarioService).ingresarLote(7L, 1L, 5L, "LOTE-X", 20.0, 9.0,
                itemRecepcion.getFechaVencimiento(), 10L);
    }

    @Test
    void avanzarEstado_rechazaTransicionInvalida() {
        SolicitudCompra solicitud = SolicitudCompra.builder()
                .id(1L).proveedor(proveedor).sucursal(sucursal)
                .estado(EstadoSolicitudCompra.CREADA)
                .build();
        when(solicitudCompraRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(NegocioException.class,
                () -> service.avanzarEstado(1L, EstadoSolicitudCompra.RECIBIDA, null, 10L));
        verify(inventarioService, never()).ingresarLote(anyLong(), anyLong(), any(), any(), anyDouble(), anyDouble(), any(), any());
    }

    @Test
    void avanzarEstado_rechazarSinMotivoEsRechazado() {
        SolicitudCompra solicitud = SolicitudCompra.builder()
                .id(1L).proveedor(proveedor).sucursal(sucursal)
                .estado(EstadoSolicitudCompra.EN_REVISION)
                .build();
        when(solicitudCompraRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        AvanzarEstadoSolicitudCompraRequest request = new AvanzarEstadoSolicitudCompraRequest();
        request.setEstado(EstadoSolicitudCompra.RECHAZADA);

        assertThrows(NegocioException.class,
                () -> service.avanzarEstado(1L, EstadoSolicitudCompra.RECHAZADA, request, 1L));
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudCompra.EN_REVISION);
    }

    @Test
    void avanzarEstado_rechazarConMotivoQueda() {
        SolicitudCompra solicitud = SolicitudCompra.builder()
                .id(1L).proveedor(proveedor).sucursal(sucursal)
                .estado(EstadoSolicitudCompra.EN_REVISION)
                .build();
        when(solicitudCompraRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        AvanzarEstadoSolicitudCompraRequest request = new AvanzarEstadoSolicitudCompraRequest();
        request.setEstado(EstadoSolicitudCompra.RECHAZADA);
        request.setMotivoRechazo("Proveedor sin stock");

        SolicitudCompra resultado = service.avanzarEstado(1L, EstadoSolicitudCompra.RECHAZADA, request, 1L);

        assertThat(resultado.getEstado()).isEqualTo(EstadoSolicitudCompra.RECHAZADA);
        assertThat(resultado.getMotivoRechazo()).isEqualTo("Proveedor sin stock");
    }

    private static double anyDouble() {
        return org.mockito.ArgumentMatchers.anyDouble();
    }
}
