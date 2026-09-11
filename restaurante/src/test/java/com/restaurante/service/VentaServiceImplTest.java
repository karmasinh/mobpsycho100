package com.restaurante.service;

import com.restaurante.entity.*;
import com.restaurante.enums.EstadoPedido;
import com.restaurante.enums.FormaPago;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.CierreCajaService;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
    @Mock private CierreCajaService cierreCajaService;
    @Mock private ConfiguracionTicketService configuracionTicketService;

    @InjectMocks
    private VentaServiceImpl ventaService;

    private Sucursal sucursal;
    private Usuario cajero;

    @BeforeEach
    void setUp() {
        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").activo(true).build();
        cajero = Usuario.builder().id(10L).username("cajero1").build();
        lenient().when(cierreCajaService.obtenerAbiertoPorCajero(10L))
                .thenReturn(Optional.of(CierreCaja.builder().id(1L).build()));
        lenient().when(configuracionTicketService.siguienteNumeroTicket(any()))
                .thenReturn("S1-000001");
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
    void anular_rechazaMotivoVacio() {
        assertThrows(NegocioException.class, () -> ventaService.anular(500L, "  ", 10L));
        assertThrows(NegocioException.class, () -> ventaService.anular(500L, null, 10L));
        verify(ventaRepository, never()).findById(any());
    }

    @Test
    void anular_rechazaVentaYaAnulada() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.CANCELADO);
        Venta venta = Venta.builder().id(500L).pedido(pedido).anulada(true).build();
        when(ventaRepository.findById(500L)).thenReturn(Optional.of(venta));

        assertThrows(NegocioException.class, () -> ventaService.anular(500L, "motivo", 10L));
    }

    @Test
    void anular_rechazaLaSegundaAnulacionConcurrenteDeLaMismaVenta() {
        // Igual patrón que cobrar_rechazaElSegundoCobroConcurrenteSobreElMismoPedido: la primera
        // anulación marca `anulada=true` en el mismo objeto que ve la segunda consulta concurrente.
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.ENTREGADO);
        Venta venta = Venta.builder().id(500L).pedido(pedido).sucursal(sucursal)
                .totalCobrado(50.0).anulada(false).creadoEn(java.time.LocalDateTime.now()).build();
        when(ventaRepository.findById(500L)).thenReturn(Optional.of(venta));
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));

        ventaService.anular(500L, "Primer intento", 10L);

        assertThrows(NegocioException.class, () -> ventaService.anular(500L, "Segundo intento", 10L));
        assertThat(venta.getMotivoAnulacion()).isEqualTo("Primer intento");
    }

    @Test
    void cobrar_rechazaElSegundoCobroConcurrenteSobreElMismoPedido() {
        // Simula dos cobros concurrentes del mismo pedido (BL-A-003/RNF-A-003): el primero
        // ve el pedido sin venta todavía; para cuando el segundo consulta, la venta del
        // primero ya existe, así que debe rechazar en vez de crear una venta duplicada.
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.LISTO);
        when(pedidoRepository.findById(100L)).thenReturn(Optional.of(pedido));
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cajero));
        when(ventaRepository.findByPedidoId(100L))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(Venta.builder().id(999L).pedido(pedido).build()));

        Venta primerCobro = ventaService.cobrar(100L, 60.0, FormaPago.EFECTIVO, 10L);
        assertThat(primerCobro).isNotNull();

        assertThrows(NegocioException.class,
                () -> ventaService.cobrar(100L, 60.0, FormaPago.EFECTIVO, 10L));

        verify(ventaRepository, times(1)).save(any());
    }

    @Test
    void cobrar_rechazaSinTurnoDeCajaAbierto() {
        Pedido pedido = pedidoConTotal(50.0, EstadoPedido.LISTO);
        when(pedidoRepository.findById(100L)).thenReturn(Optional.of(pedido));
        when(ventaRepository.findByPedidoId(100L)).thenReturn(Optional.empty());
        when(cierreCajaService.obtenerAbiertoPorCajero(10L)).thenReturn(Optional.empty());

        assertThrows(NegocioException.class,
                () -> ventaService.cobrar(100L, 60.0, FormaPago.EFECTIVO, 10L));

        verify(ventaRepository, never()).save(any());
    }
}
