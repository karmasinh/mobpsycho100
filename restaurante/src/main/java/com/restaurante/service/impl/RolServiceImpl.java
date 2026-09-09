package com.restaurante.service.impl;

import com.restaurante.dto.request.RolRequest;
import com.restaurante.entity.ModuloMenu;
import com.restaurante.entity.Rol;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.ModuloMenuRepository;
import com.restaurante.repository.RolRepository;
import com.restaurante.service.RolService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolServiceImpl implements RolService {

    private final RolRepository rolRepository;
    private final ModuloMenuRepository moduloMenuRepository;

    @Override
    @Transactional
    public Rol crear(RolRequest request) {
        String nombre = request.getNombre().toUpperCase().trim();
        if (rolRepository.existsByNombre(nombre)) {
            throw new DuplicadoException("Ya existe un rol con nombre: " + nombre);
        }

        Set<ModuloMenu> modulos = resolverModulos(request.getModuloIds());

        Rol rol = Rol.builder()
                .nombre(nombre)
                .descripcion(request.getDescripcion())
                .activo(true)
                .modulos(modulos)
                .build();

        return rolRepository.save(rol);
    }

    @Override
    @Transactional
    public Rol actualizar(Long id, RolRequest request) {
        Rol rol = obtenerPorId(id);
        String nuevoNombre = request.getNombre().toUpperCase().trim();

        if (!rol.getNombre().equals(nuevoNombre) && rolRepository.existsByNombre(nuevoNombre)) {
            throw new DuplicadoException("Ya existe un rol con nombre: " + nuevoNombre);
        }

        rol.setNombre(nuevoNombre);
        rol.setDescripcion(request.getDescripcion());

        if (request.getModuloIds() != null) {
            rol.setModulos(resolverModulos(request.getModuloIds()));
        }

        return rolRepository.save(rol);
    }

    @Override
    @Transactional(readOnly = true)
    public Rol obtenerPorId(Long id) {
        return rolRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Rol> listarActivos() {
        return rolRepository.findAll().stream()
                .filter(r -> Boolean.TRUE.equals(r.getActivo()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void asignarModulos(Long rolId, Set<Long> moduloIds) {
        Rol rol = obtenerPorId(rolId);
        Set<ModuloMenu> nuevos = resolverModulos(moduloIds);
        rol.getModulos().addAll(nuevos);
        rolRepository.save(rol);
    }

    @Override
    @Transactional
    public void eliminarModulos(Long rolId, Set<Long> moduloIds) {
        Rol rol = obtenerPorId(rolId);
        rol.getModulos().removeIf(m -> moduloIds.contains(m.getId()));
        rolRepository.save(rol);
    }

    @Override
    @Transactional
    public void desactivar(Long id) {
        Rol rol = obtenerPorId(id);
        if (!rol.getUsuarios().isEmpty()) {
            throw new NegocioException(
                    "No se puede desactivar el rol '" + rol.getNombre() +
                    "' porque tiene " + rol.getUsuarios().size() + " usuario(s) asignado(s).");
        }
        rol.setActivo(false);
        rolRepository.save(rol);
    }

    // ─── helper ───────────────────────────────────────────────────

    private Set<ModuloMenu> resolverModulos(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        return ids.stream()
                .map(mId -> moduloMenuRepository.findById(mId)
                        .orElseThrow(() -> new RecursoNoEncontradoException("ModuloMenu", mId)))
                .collect(Collectors.toSet());
    }
}
