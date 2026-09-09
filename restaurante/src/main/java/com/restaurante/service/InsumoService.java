package com.restaurante.service;

import com.restaurante.dto.request.InsumoRequest;
import com.restaurante.dto.response.InsumoResponse;

import java.util.List;

public interface InsumoService {
    InsumoResponse crear(InsumoRequest request);
    InsumoResponse actualizar(Long id, InsumoRequest request);
    InsumoResponse obtenerPorId(Long id);
    List<InsumoResponse> listarTodos();
    List<InsumoResponse> listarActivos();
    void desactivar(Long id);
}