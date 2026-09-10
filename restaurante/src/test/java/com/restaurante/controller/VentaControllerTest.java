package com.restaurante.controller;

import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Venta;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.VentaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Aislamiento cruzado por sucursal en VentaController.obtener (AUD-A-006).
 */
@ExtendWith(MockitoExtension.class)
class VentaControllerTest {

    @Mock private VentaService ventaService;
    @Mock private UserDetailsImpl user;

    private final SucursalAccessService sucursalAccessService = new SucursalAccessService();

    private Venta ventaDeSucursal(Long sucursalId) {
        return Venta.builder().id(1L).sucursal(Sucursal.builder().id(sucursalId).build()).build();
    }

    @Test
    void obtener_rechazaVentaDeOtraSucursal() {
        VentaController ctrl = new VentaController(ventaService, sucursalAccessService);
        when(ventaService.obtenerPorId(1L)).thenReturn(ventaDeSucursal(2L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThatThrownBy(() -> ctrl.obtener(1L, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void obtener_permiteVentaDeLaMismaSucursal() {
        VentaController ctrl = new VentaController(ventaService, sucursalAccessService);
        when(ventaService.obtenerPorId(1L)).thenReturn(ventaDeSucursal(1L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThat(ctrl.obtener(1L, user).getBody()).isNotNull();
    }
}
