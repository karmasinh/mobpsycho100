package com.restaurante.service.impl;

import com.restaurante.dto.request.InsumoRequest;
import com.restaurante.dto.response.InsumoResponse;
import com.restaurante.entity.CategoriaInsumo;
import com.restaurante.entity.Insumo;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.CategoriaInsumoRepository;
import com.restaurante.repository.InsumoRepository;
import com.restaurante.service.InsumoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InsumoServiceImpl implements InsumoService {

    private final InsumoRepository insumoRepository;
    private final CategoriaInsumoRepository categoriaInsumoRepository;

    // ── Mapper privado ────────────────────────────────────────────────────────
    private InsumoResponse toResponse(Insumo insumo) {
        CategoriaInsumo cat = insumo.getCategoria();
        return InsumoResponse.builder()
                .id(insumo.getId())
                .codigo(insumo.getCodigo())
                .nombre(insumo.getNombre())
                .unidadMedida(insumo.getUnidadMedida())
                .precioUnitario(insumo.getPrecioUnitario())
                .perecedero(insumo.getPerecedero())
                .activo(insumo.getActivo())
                .categoriaId(cat != null ? cat.getId() : null)
                .categoriaNombre(cat != null ? cat.getNombre() : null)
                .creadoEn(insumo.getCreadoEn())
                .actualizadoEn(insumo.getActualizadoEn())
                .build();
    }

    // ── Métodos del servicio ──────────────────────────────────────────────────
    @Override
    @Transactional
    public InsumoResponse crear(InsumoRequest request) {
        if (insumoRepository.existsByCodigo(request.getCodigo())) {
            throw new DuplicadoException("Ya existe un insumo con el código: " + request.getCodigo());
        }

        CategoriaInsumo categoria = resolverCategoria(request.getCategoriaId());

        Insumo insumo = Insumo.builder()
                .codigo(request.getCodigo())
                .nombre(request.getNombre())
                .unidadMedida(request.getUnidadMedida())
                .precioUnitario(request.getPrecioUnitario() != null ? request.getPrecioUnitario() : 0.0)
                .perecedero(request.getPerecedero() != null ? request.getPerecedero() : false)
                .categoria(categoria)
                .activo(request.getActivo() != null ? request.getActivo() : true)
                .build();

        return toResponse(insumoRepository.save(insumo));
    }

    @Override
    @Transactional
    public InsumoResponse actualizar(Long id, InsumoRequest request) {
        Insumo insumo = buscarEntidadPorId(id);

        if (!insumo.getCodigo().equals(request.getCodigo())
                && insumoRepository.existsByCodigo(request.getCodigo())) {
            throw new DuplicadoException("Ya existe un insumo con el código: " + request.getCodigo());
        }

        insumo.setCodigo(request.getCodigo());
        insumo.setNombre(request.getNombre());
        insumo.setUnidadMedida(request.getUnidadMedida());
        insumo.setCategoria(resolverCategoria(request.getCategoriaId()));

        if (request.getPrecioUnitario() != null) insumo.setPrecioUnitario(request.getPrecioUnitario());
        if (request.getPerecedero()     != null) insumo.setPerecedero(request.getPerecedero());
        if (request.getActivo()         != null) insumo.setActivo(request.getActivo());

        return toResponse(insumoRepository.save(insumo));
    }

    @Override
    @Transactional(readOnly = true)
    public InsumoResponse obtenerPorId(Long id) {
        return toResponse(buscarEntidadPorId(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<InsumoResponse> listarTodos() {
        return insumoRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InsumoResponse> listarActivos() {
        return insumoRepository.findByActivoTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void desactivar(Long id) {
        Insumo insumo = buscarEntidadPorId(id);
        insumo.setActivo(false);
        insumoRepository.save(insumo);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /** Usado internamente cuando se necesita la entidad (actualizar, desactivar). */
    private Insumo buscarEntidadPorId(Long id) {
        return insumoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", id));
    }

    private CategoriaInsumo resolverCategoria(Long categoriaId) {
        if (categoriaId == null) return null;
        return categoriaInsumoRepository.findById(categoriaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría de insumo", categoriaId));
    }
}