package com.restaurante.service;

import com.restaurante.dto.request.EmpleadoRequest;
import com.restaurante.dto.response.EmpleadoResponse;
import com.restaurante.enums.TurnoEmpleado;

import java.util.List;

public interface EmpleadoService {
    EmpleadoResponse crear(EmpleadoRequest request);
    EmpleadoResponse actualizar(Long id, EmpleadoRequest request);
    EmpleadoResponse obtenerPorId(Long id);
    List<EmpleadoResponse> listarActivos();
    List<EmpleadoResponse> listarActivos(TurnoEmpleado turno, Long sucursalId);
    void desactivar(Long id);
    void asignarRol(Long usuarioId, Long rolId);
    void desbloquearUsuario(Long usuarioId);
    void cambiarPassword(Long usuarioId, String nuevaPassword);
}