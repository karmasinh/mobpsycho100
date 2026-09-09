package com.restaurante.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Resuelve la sucursal efectiva de una operación. Si el usuario autenticado
 * tiene una sucursal fija (vía Empleado.sucursal), esa siempre gana sobre
 * cualquier valor enviado por el cliente. Si no tiene sucursal fija (ADMIN
 * o empleado sin sucursal asignada), se usa el valor solicitado tal cual.
 */
@Component
public class SucursalAccessService {

    public Long resolver(UserDetailsImpl user, Long solicitada) {
        return user.getSucursalId() != null ? user.getSucursalId() : solicitada;
    }

    /**
     * Verifica que un recurso ya persistido (identificado por su sucursal)
     * pertenezca a la sucursal efectiva del usuario. Se usa en las consultas
     * por ID, donde no hay parámetro de sucursal que resolver de antemano:
     * el recurso ya existe y hay que confirmar que el usuario puede verlo.
     * Un usuario sin sucursal fija (ADMIN u operador multi-sucursal) no se
     * restringe.
     */
    public void verificarPertenece(UserDetailsImpl user, Long sucursalRecursoId) {
        if (user.getSucursalId() != null
                && sucursalRecursoId != null
                && !user.getSucursalId().equals(sucursalRecursoId)) {
            throw new AccessDeniedException("El recurso pertenece a otra sucursal");
        }
    }
}
