package com.restaurante.service;

import com.restaurante.dto.request.RolRequest;
import com.restaurante.entity.Rol;

import java.util.List;
import java.util.Set;

public interface RolService {
    Rol crear(RolRequest request);
    Rol actualizar(Long id, RolRequest request);
    Rol obtenerPorId(Long id);
    List<Rol> listarActivos();
    void asignarModulos(Long rolId, Set<Long> moduloIds);
    void eliminarModulos(Long rolId, Set<Long> moduloIds);
    void desactivar(Long id);
}
