package com.restaurante.controller;

import com.restaurante.entity.AuditoriaLog;
import com.restaurante.entity.Sucursal;
import com.restaurante.repository.AuditoriaLogRepository;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * AUD-A-028/AUD-L-022: /auditoria ahora filtra por la sucursal efectiva del
 * usuario, igual que AlertaController — un evento sin sucursal asociada
 * (login, catálogos globales) sigue siendo visible para todos.
 */
@ExtendWith(MockitoExtension.class)
class AuditoriaControllerTest {

    @Mock private AuditoriaLogRepository auditoriaLogRepository;
    @Mock private UserDetailsImpl user;

    private final SucursalAccessService sucursalAccessService = new SucursalAccessService();

    private AuditoriaController controller() {
        return new AuditoriaController(auditoriaLogRepository, sucursalAccessService);
    }

    private AuditoriaLog logDeSucursal(Long id, Long sucursalId) {
        return AuditoriaLog.builder().id(id)
                .sucursal(sucursalId == null ? null : Sucursal.builder().id(sucursalId).build())
                .build();
    }

    @Test
    void listar_soloDevuelveLosDeLaSucursalDelUsuarioMasLosGlobales() {
        when(user.getSucursalId()).thenReturn(1L);
        when(auditoriaLogRepository.findAll()).thenReturn(List.of(
                logDeSucursal(1L, 1L), logDeSucursal(2L, 2L), logDeSucursal(3L, null)));

        var respuesta = controller().listar(null, user);

        assertThat(respuesta.getBody()).extracting(AuditoriaLog::getId).containsExactly(1L, 3L);
    }

    @Test
    void listar_admin_sinSucursalFija_veTodo() {
        when(user.getSucursalId()).thenReturn(null);
        when(auditoriaLogRepository.findAll()).thenReturn(List.of(
                logDeSucursal(1L, 1L), logDeSucursal(2L, 2L)));

        var respuesta = controller().listar(null, user);

        assertThat(respuesta.getBody()).hasSize(2);
    }
}
