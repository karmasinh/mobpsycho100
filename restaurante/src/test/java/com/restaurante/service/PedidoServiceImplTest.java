package com.restaurante.service;

import com.restaurante.dto.request.PedidoRequest;
import com.restaurante.entity.Plato;
import com.restaurante.entity.Sucursal;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.PedidoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Hallazgo real (2026-09-11, comparando contra la versión base del sistema —
 * ver 10_BACKLOG_Y_CAMBIOS.md): la API aceptaba cualquier plato en sopaSeleccionadaId/
 * segundoSeleccionadoId sin validar su tipo real. Un SEGUNDO mandado como sopa creaba el
 * pedido igual, la comanda salía mal y se descontaban dos unidades de la misma línea de
 * producción. Corregido con exigirRol(...) en PedidoServiceImpl.crear.
 */
@ExtendWith(MockitoExtension.class)
class PedidoServiceImplTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private PensionadoRepository pensionadoRepository;
    @Mock private PlatoRepository platoRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private EmpleadoRepository empleadoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private PedidoServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PedidoServiceImpl(pedidoRepository, clienteRepository, pensionadoRepository,
                platoRepository, sucursalRepository, empleadoRepository, usuarioRepository, messagingTemplate);
        when(sucursalRepository.findById(1L)).thenReturn(Optional.of(Sucursal.builder().id(1L).build()));
    }

    private PedidoRequest.DetallePedidoRequest detalle(Long platoId, Long sopaId, Long segundoId) {
        PedidoRequest.DetallePedidoRequest d = new PedidoRequest.DetallePedidoRequest();
        d.setPlatoId(platoId);
        d.setCantidad(1);
        d.setSopaSeleccionadaId(sopaId);
        d.setSegundoSeleccionadoId(segundoId);
        return d;
    }

    @Test
    void crear_rechazaUnSegundoMandadoComoSopa() {
        Plato almuerzo = Plato.builder().id(1L).nombre("Almuerzo").activo(true).tipo("ALMUERZO").precioVenta(10.0).build();
        Plato segundoRealComoSopa = Plato.builder().id(2L).nombre("Pollo al horno").tipo("SEGUNDO").build();

        when(platoRepository.findById(1L)).thenReturn(Optional.of(almuerzo));
        when(platoRepository.findById(2L)).thenReturn(Optional.of(segundoRealComoSopa));

        // segundoSeleccionadoId no importa para este caso: exigirRol rechaza la sopa
        // (id 2) antes de siquiera resolver el segundo.
        PedidoRequest request = new PedidoRequest();
        request.setSucursalId(1L);
        request.setDetalles(List.of(detalle(1L, 2L, 3L)));

        assertThatThrownBy(() -> service.crear(request, null))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("no puede usarse como sopa");
    }

    @Test
    void crear_aceptaSopaYSegundoConTipoCorrecto() {
        Plato almuerzo = Plato.builder().id(1L).nombre("Almuerzo").activo(true).tipo("ALMUERZO").precioVenta(10.0).build();
        Plato sopaReal = Plato.builder().id(2L).nombre("Sopa de maní").tipo("SOPA").build();
        Plato segundoReal = Plato.builder().id(3L).nombre("Milanesa").tipo("SEGUNDO").build();

        when(platoRepository.findById(1L)).thenReturn(Optional.of(almuerzo));
        when(platoRepository.findById(2L)).thenReturn(Optional.of(sopaReal));
        when(platoRepository.findById(3L)).thenReturn(Optional.of(segundoReal));
        when(pedidoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PedidoRequest request = new PedidoRequest();
        request.setSucursalId(1L);
        request.setDetalles(List.of(detalle(1L, 2L, 3L)));

        assertThat(service.crear(request, null).getDetalles()).hasSize(1);
    }
}
