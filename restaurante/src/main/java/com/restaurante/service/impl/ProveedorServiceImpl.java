package com.restaurante.service.impl;

import com.restaurante.entity.Proveedor;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.ProveedorRepository;
import com.restaurante.service.ProveedorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProveedorServiceImpl implements ProveedorService {

    private final ProveedorRepository proveedorRepository;

    @Override
    @Transactional
    public Proveedor crear(Proveedor proveedor) {
        if (proveedorRepository.existsByNit(proveedor.getNit())) {
            throw new DuplicadoException("Ya existe un proveedor con el NIT: " + proveedor.getNit());
        }
        if (proveedorRepository.existsByNombre(proveedor.getNombre())) {
            throw new DuplicadoException("Ya existe un proveedor con el nombre: " + proveedor.getNombre());
        }
        proveedor.setActivo(true);
        return proveedorRepository.save(proveedor);
    }

    @Override
    @Transactional
    public Proveedor actualizar(Long id, Proveedor request) {
        Proveedor proveedor = buscarPorId(id);

        if (!proveedor.getNit().equals(request.getNit())
                && proveedorRepository.existsByNit(request.getNit())) {
            throw new DuplicadoException("Ya existe un proveedor con el NIT: " + request.getNit());
        }
        if (!proveedor.getNombre().equals(request.getNombre())
                && proveedorRepository.existsByNombre(request.getNombre())) {
            throw new DuplicadoException("Ya existe un proveedor con el nombre: " + request.getNombre());
        }

        proveedor.setNit(request.getNit());
        proveedor.setNombre(request.getNombre());
        proveedor.setDireccion(request.getDireccion());
        proveedor.setTelefono(request.getTelefono());
        proveedor.setCorreo(request.getCorreo());
        proveedor.setContacto(request.getContacto());
        if (request.getActivo() != null) proveedor.setActivo(request.getActivo());

        return proveedorRepository.save(proveedor);
    }

    @Override
    @Transactional(readOnly = true)
    public Proveedor obtenerPorId(Long id) {
        return buscarPorId(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Proveedor> listarActivos() {
        return proveedorRepository.findByActivoTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Proveedor> listarTodos() {
        return proveedorRepository.findAll();
    }

    @Override
    @Transactional
    public void desactivar(Long id) {
        Proveedor proveedor = buscarPorId(id);
        proveedor.setActivo(false);
        proveedorRepository.save(proveedor);
    }

    private Proveedor buscarPorId(Long id) {
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor", id));
    }
}
