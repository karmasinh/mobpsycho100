package com.restaurante.controller;

import com.restaurante.entity.AlertaSistema;
import com.restaurante.entity.Sucursal;
import com.restaurante.repository.AlertaSistemaRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * AUD-L-008: contar/marcar alertas debe respetar la sucursal efectiva del
 * usuario, igual que ya hacía listarNoLeidas — antes, un usuario con sucursal
 * fija veía el conteo global y "marcar todas" tocaba alertas de otras sucursales.
 */
@ExtendWith(MockitoExtension.class)
class AlertaControllerTest {

    @Mock private AlertaSistemaRepository alertaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private UserDetailsImpl user;

    private final SucursalAccessService sucursalAccessService = new SucursalAccessService();

    private AlertaController controller() {
        return new AlertaController(alertaRepository, usuarioRepository, sucursalAccessService);
    }

    private AlertaSistema alertaDeSucursal(Long id, Long sucursalId) {
        return AlertaSistema.builder().id(id).leida(false)
                .sucursal(sucursalId == null ? null : Sucursal.builder().id(sucursalId).build())
                .build();
    }

    @Test
    void contarNoLeidas_soloCuentaLasDeLaSucursalDelUsuario() {
        when(user.getSucursalId()).thenReturn(1L);
        when(alertaRepository.findByLeidaFalseOrderByCreadoEnDesc()).thenReturn(List.of(
                alertaDeSucursal(1L, 1L), alertaDeSucursal(2L, 2L), alertaDeSucursal(3L, null)));

        var respuesta = controller().contarNoLeidas(null, user);

        assertThat(respuesta.getBody().get("total")).isEqualTo(2L); // la propia + la global, no la de sucursal 2
    }

    @Test
    void marcarTodasLeidas_noTocaAlertasDeOtraSucursal() {
        when(user.getSucursalId()).thenReturn(1L);
        when(user.getId()).thenReturn(10L);
        when(usuarioRepository.findById(10L)).thenReturn(Optional.empty());
        AlertaSistema propia = alertaDeSucursal(1L, 1L);
        AlertaSistema ajena = alertaDeSucursal(2L, 2L);
        when(alertaRepository.findByLeidaFalseOrderByCreadoEnDesc()).thenReturn(List.of(propia, ajena));

        controller().marcarTodasLeidas(null, user);

        assertThat(propia.getLeida()).isTrue();
        assertThat(ajena.getLeida()).isFalse();
        verify(alertaRepository).saveAll(List.of(propia));
    }
}
