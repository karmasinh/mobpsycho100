package com.restaurante.controller;

import com.restaurante.entity.ProduccionDia;
import com.restaurante.entity.Sucursal;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.ProduccionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Aislamiento cruzado por sucursal en ProduccionController.obtener (AUD-L-017).
 */
@ExtendWith(MockitoExtension.class)
class ProduccionControllerTest {

    @Mock private ProduccionService produccionService;
    @Mock private UserDetailsImpl user;

    private final SucursalAccessService sucursalAccessService = new SucursalAccessService();

    private ProduccionDia produccionDeSucursal(Long sucursalId) {
        return ProduccionDia.builder().id(1L).sucursal(Sucursal.builder().id(sucursalId).build()).build();
    }

    @Test
    void obtener_rechazaProduccionDeOtraSucursal() {
        ProduccionController ctrl = new ProduccionController(produccionService, sucursalAccessService);
        when(produccionService.obtenerPorId(1L)).thenReturn(produccionDeSucursal(2L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThatThrownBy(() -> ctrl.obtener(1L, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void obtener_permiteProduccionDeLaMismaSucursal() {
        ProduccionController ctrl = new ProduccionController(produccionService, sucursalAccessService);
        when(produccionService.obtenerPorId(1L)).thenReturn(produccionDeSucursal(1L));
        when(user.getSucursalId()).thenReturn(1L);

        assertThat(ctrl.obtener(1L, user).getBody()).isNotNull();
    }

    @Test
    void listar_resuelveSiempreALaSucursalFijaDelUsuario() {
        ProduccionController ctrl = new ProduccionController(produccionService, sucursalAccessService);
        when(user.getSucursalId()).thenReturn(1L);

        ctrl.listar(2L, user); // pide la sucursal 2, pero el usuario está fijo a la 1

        org.mockito.Mockito.verify(produccionService).listarPorSucursal(1L);
    }
}
