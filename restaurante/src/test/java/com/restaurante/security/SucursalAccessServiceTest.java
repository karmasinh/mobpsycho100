package com.restaurante.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SucursalAccessServiceTest {

    private final SucursalAccessService service = new SucursalAccessService();

    @Mock private UserDetailsImpl user;

    // ─── resolver ──────────────────────────────────────────────────

    @Test
    void resolver_usaLaSucursalFijaDelUsuarioAunqueSeSolicitaOtra() {
        when(user.getSucursalId()).thenReturn(1L);

        assertThat(service.resolver(user, 99L)).isEqualTo(1L);
    }

    @Test
    void resolver_usaLaSolicitadaCuandoElUsuarioNoTieneSucursalFija() {
        when(user.getSucursalId()).thenReturn(null);

        assertThat(service.resolver(user, 7L)).isEqualTo(7L);
    }

    // ─── verificarPertenece ────────────────────────────────────────

    @Test
    void verificarPertenece_permiteCuandoElRecursoEsDeLaSucursalDelUsuario() {
        when(user.getSucursalId()).thenReturn(1L);

        assertThatCode_noLanza(() -> service.verificarPertenece(user, 1L));
    }

    @Test
    void verificarPertenece_rechazaCuandoElRecursoEsDeOtraSucursal() {
        when(user.getSucursalId()).thenReturn(1L);

        assertThatThrownBy(() -> service.verificarPertenece(user, 2L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void verificarPertenece_permiteCuandoElUsuarioNoTieneSucursalFija() {
        when(user.getSucursalId()).thenReturn(null);

        assertThatCode_noLanza(() -> service.verificarPertenece(user, 2L));
    }

    @Test
    void verificarPertenece_permiteCuandoElRecursoNoTieneSucursalAsociada() {
        when(user.getSucursalId()).thenReturn(1L);

        assertThatCode_noLanza(() -> service.verificarPertenece(user, null));
    }

    private void assertThatCode_noLanza(Runnable runnable) {
        runnable.run();
    }
}
