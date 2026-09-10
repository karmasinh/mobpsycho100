package com.restaurante.controller;

import com.restaurante.entity.Pedido;
import com.restaurante.entity.Sucursal;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.PedidoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Aislamiento cruzado por sucursal en consultas por ID (AUD-A-002/AUD-L-006):
 * un usuario con sucursal fija no debe poder leer un pedido de otra sucursal.
 */
@ExtendWith(MockitoExtension.class)
class PedidoControllerTest {

    @Mock private PedidoService pedidoService;
    @Mock private UserDetailsImpl user;

    // SucursalAccessService no es un mock: se usa la implementación real para
    // ejercitar el comportamiento efectivo, igual que en producción.
    private final SucursalAccessService sucursalAccessService = new SucursalAccessService();

    private Pedido pedidoDeSucursal(Long sucursalId) {
        return Pedido.builder().id(1L).sucursal(Sucursal.builder().id(sucursalId).build()).build();
    }

    @Test
    void obtener_rechazaPedidoDeOtraSucursal() {
        PedidoController ctrl = new PedidoController(pedidoService, sucursalAccessService);
        when(pedidoService.obtenerPorId(1L)).thenReturn(pedidoDeSucursal(2L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThatThrownBy(() -> ctrl.obtener(1L, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void obtener_permitePedidoDeLaMismaSucursal() {
        PedidoController ctrl = new PedidoController(pedidoService, sucursalAccessService);
        when(pedidoService.obtenerPorId(1L)).thenReturn(pedidoDeSucursal(1L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThat(ctrl.obtener(1L, user).getBody()).isNotNull();
    }

    @Test
    void obtener_permiteCualquierSucursalParaUsuarioSinSucursalFija() {
        PedidoController ctrl = new PedidoController(pedidoService, sucursalAccessService);
        when(pedidoService.obtenerPorId(1L)).thenReturn(pedidoDeSucursal(2L));
        when(user.getSucursalId()).thenReturn(null);

        assertThat(ctrl.obtener(1L, user).getBody()).isNotNull();
    }

    @Test
    void cambiarEstado_rechazaPedidoDeOtraSucursal() {
        PedidoController ctrl = new PedidoController(pedidoService, sucursalAccessService);
        when(pedidoService.obtenerPorId(1L)).thenReturn(pedidoDeSucursal(2L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThatThrownBy(() -> ctrl.cambiarEstado(1L, com.restaurante.enums.EstadoPedido.EN_PREPARACION, user))
                .isInstanceOf(AccessDeniedException.class);
    }
}
