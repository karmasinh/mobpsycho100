package com.restaurante.service.impl;

import com.restaurante.dto.request.PlatoRequest;
import com.restaurante.entity.CategoriaPlato;
import com.restaurante.entity.Plato;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.CategoriaPlatoRepository;
import com.restaurante.repository.PlatoRepository;
import com.restaurante.service.PlatoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlatoServiceImpl implements PlatoService {

    private final PlatoRepository platoRepository;
    private final CategoriaPlatoRepository categoriaPlatoRepository;

    @Override
    @Transactional
    public Plato crear(PlatoRequest request) {
        if (platoRepository.existsByCodigo(request.getCodigo())) {
            throw new DuplicadoException("Ya existe un plato con el código: " + request.getCodigo());
        }

        List<CategoriaPlato> categorias = new ArrayList<>();
        if (request.getCategoriaIds() != null && !request.getCategoriaIds().isEmpty()) {
            categorias = categoriaPlatoRepository.findAllById(request.getCategoriaIds());
        }

        Plato plato = Plato.builder()
                .codigo(request.getCodigo())
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .precioVenta(request.getPrecioVenta())
                .costoEstimado(request.getCostoEstimado() != null ? request.getCostoEstimado() : 0.0)
                .tipo(request.getTipo())
                .categorias(categorias)
                .activo(request.getActivo() != null ? request.getActivo() : true)
                .build();

        return platoRepository.save(plato);
    }

    @Override
    @Transactional
    public Plato actualizar(Long id, PlatoRequest request) {
        Plato plato = obtenerPorId(id);

        if (!plato.getCodigo().equals(request.getCodigo()) && platoRepository.existsByCodigo(request.getCodigo())) {
            throw new DuplicadoException("Ya existe un plato con el código: " + request.getCodigo());
        }

        List<CategoriaPlato> categorias = new ArrayList<>();
        if (request.getCategoriaIds() != null && !request.getCategoriaIds().isEmpty()) {
            categorias = categoriaPlatoRepository.findAllById(request.getCategoriaIds());
        }

        plato.setCodigo(request.getCodigo());
        plato.setNombre(request.getNombre());
        plato.setDescripcion(request.getDescripcion());
        plato.setPrecioVenta(request.getPrecioVenta());
        if (request.getCostoEstimado() != null) {
            plato.setCostoEstimado(request.getCostoEstimado());
        }
        plato.setTipo(request.getTipo());
        plato.setCategorias(categorias);
        if (request.getActivo() != null) {
            plato.setActivo(request.getActivo());
        }

        return platoRepository.save(plato);
    }

    @Override
    @Transactional(readOnly = true)
    public Plato obtenerPorId(Long id) {
        return platoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Plato", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Plato> listarTodos() {
        return platoRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Plato> listarActivos() {
        return platoRepository.findByActivoTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Plato> listarPorTipo(String tipo) {
        return platoRepository.findByTipoAndActivoTrue(tipo);
    }

    @Override
    @Transactional
    public void desactivar(Long id) {
        Plato plato = obtenerPorId(id);
        plato.setActivo(false);
        platoRepository.save(plato);
    }
}
