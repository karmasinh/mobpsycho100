package com.restaurante.service;

import com.restaurante.dto.request.PlatoRequest;
import com.restaurante.entity.Plato;

import java.util.List;

public interface PlatoService {
    Plato crear(PlatoRequest request);
    Plato actualizar(Long id, PlatoRequest request);
    Plato obtenerPorId(Long id);
    List<Plato> listarTodos();
    List<Plato> listarActivos();
    List<Plato> listarPorTipo(String tipo);
    void desactivar(Long id);
}
