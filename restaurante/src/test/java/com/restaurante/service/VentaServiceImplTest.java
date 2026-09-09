package com.restaurante.service;

import com.restaurante.entity.*;
import com.restaurante.enums.EstadoPedido;
import com.restaurante.enums.FormaPago;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.VentaServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VentaServiceImplTest {

    @Mock private VentaRepository ventaRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuditoriaLogRepository auditoriaLogRepository;
    @Mock private DetallePedidoRepository detallePedidoRepository;
    @Mock private PlatoRepository platoRepository;
    @Mock private ProduccionService produccionService;

    @InjectMocks
    private VentaServiceImpl ventaService;

    private Sucursal sucursal;
    private Usuario cajero;

    @BeforeEach
    void setUp() {
        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").activo(true).build();
        cajero = Usuario.builder().id(10L).username("cajero1").build();
    }

    private Pedido pedidoConTotal(double total, EstadoPedido estado) {
        return Pedido.builder()
                .id(100L)
                .sucursal(sucursal)
                .estado(estado)
                .total(total)
                .detalles(new ArrayList<>())
                .build();
    }

    @Test
    void cobrar_calculaVueltoYMarcaPedidoEntregado() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.PENDIENTE);
        when(pedidoRepository.findById(100L)).thenReturn(Optional.of(pedido));
        when(ventaRepository.findByPedidoId(100L)).thenReturn(Optional.empty());
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));

        Venta venta = ventaService.cobrar(100L, 60.0, FormaPago.EFECTIVO, 10L);

        assertThat(venta.getVuelto()).isEqualTo(10.0);
        assertThat(venta.getTotalCobrado()).isEqualTo(50.0);
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.ENTREGADO);
    }

    @Test
    void cobrar_rechazaMontoInsuficiente() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.LISTO);
        when(pedidoRepository.findById(100L)).thenReturn(Optional.of(pedido));
        when(ventaRepository.findByPedidoId(100L)).thenReturn(Optional.empty());

        assertThrows(NegocioException.class,
                () -> ventaService.cobrar(100L, 30.0, FormaPago.EFECTIVO, 10L));
    }

    @Test
    void cobrar_permiteCreditoCuentaSinMontoRecibido() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.LISTO);
        when(pedidoRepository.findById(100L)).thenReturn(Optional.of(pedido));
        when(ventaRepository.findByPedidoId(100L)).thenReturn(Optional.empty());
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));

        Venta venta = ventaService.cobrar(100L, 0.0, FormaPago.CREDITO_CUENTA, 10L);

        assertThat(venta.getVuelto()).isEqualTo(0.0);
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.ENTREGADO);
    }

    @Test
    void anular_revierteElPedidoACancelado() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.ENTREGADO);
        Venta venta = Venta.builder()
                .id(500L)
                .pedido(pedido)
                .sucursal(sucursal)
                .totalCobrado(50.0)
                .anulada(false)
                .creadoEn(java.time.LocalDateTime.now())
                .build();

        when(ventaRepository.findById(500L)).thenReturn(Optional.of(venta));
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));

        ventaService.anular(500L, "Cliente se arrepintió", 10L);

        assertThat(venta.getAnulada()).isTrue();
        assertThat(venta.getMotivoAnulacion()).isEqualTo("Cliente se arrepintió");
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.CANCELADO);
    }

    @Test
    void anular_rechazaVentaYaAnulada() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.CANCELADO);
        Venta venta = Venta.builder().id(500L).pedido(pedido).anulada(true).build();
        when(ventaRepository.findById(500L)).thenReturn(Optional.of(venta));

        assertThrows(NegocioException.class, () -> ventaService.anular(500L, "motivo", 10L));
    }
}
