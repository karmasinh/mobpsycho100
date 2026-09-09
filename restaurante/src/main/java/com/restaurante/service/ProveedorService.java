package com.restaurante.service;

import com.restaurante.entity.Proveedor;

import java.util.List;

public interface ProveedorService {
    Proveedor crear(Proveedor proveedor);
    Proveedor actualizar(Long id, Proveedor proveedor);
    Proveedor obtenerPorId(Long id);
    List<Proveedor> listarActivos();
    List<Proveedor> listarTodos();
    void desactivar(Long id);
}
