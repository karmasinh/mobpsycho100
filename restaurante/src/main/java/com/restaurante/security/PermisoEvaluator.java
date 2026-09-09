package com.restaurante.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Puente entre el sistema de módulos dinámicos (Rol → Set&lt;ModuloMenu&gt;) y la
 * autorización real de la API. Se usa dentro de @PreAuthorize como
 * "hasAnyRole(...) or @perm.tiene(authentication, 'MOD_X')": aditivo puro,
 * ningún rol de sistema pierde acceso — cualquier rol (de sistema o creado a
 * mano desde /roles) con el módulo asignado gana acceso al endpoint aunque su
 * nombre no coincida con ninguno de los roles hardcodeados.
 */
@Component("perm")
public class PermisoEvaluator {

    public boolean tiene(Authentication authentication, String moduloCodigo) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl user)) {
            return false;
        }
        return user.getModulos().contains(moduloCodigo);
    }
}
