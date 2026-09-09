package com.restaurante.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermisoEvaluatorTest {

    @Mock private Authentication authentication;
    @Mock private UserDetailsImpl userDetails;

    private final PermisoEvaluator permisoEvaluator = new PermisoEvaluator();

    @Test
    void tiene_devuelveTrueSiElUsuarioTieneElModulo() {
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getModulos()).thenReturn(List.of("MOD_INVENTARIO", "MOD_RECETAS"));

        assertThat(permisoEvaluator.tiene(authentication, "MOD_INVENTARIO")).isTrue();
    }

    @Test
    void tiene_devuelveFalseSiElUsuarioNoTieneElModulo() {
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getModulos()).thenReturn(List.of("MOD_RECETAS"));

        assertThat(permisoEvaluator.tiene(authentication, "MOD_INVENTARIO")).isFalse();
    }

    @Test
    void tiene_devuelveFalseSiElPrincipalNoEsUserDetailsImpl() {
        when(authentication.getPrincipal()).thenReturn("anonymousUser");

        assertThat(permisoEvaluator.tiene(authentication, "MOD_INVENTARIO")).isFalse();
    }

    @Test
    void tiene_devuelveFalseSiAuthenticationEsNull() {
        assertThat(permisoEvaluator.tiene(null, "MOD_INVENTARIO")).isFalse();
    }
}
