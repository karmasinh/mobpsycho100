package com.restaurante.service.impl;

import com.restaurante.dto.request.EmpleadoRequest;
import com.restaurante.dto.response.EmpleadoResponse;
import com.restaurante.entity.Empleado;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Usuario;
import com.restaurante.enums.EstadoEmpleado;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.*;
import com.restaurante.service.EmpleadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmpleadoServiceImpl implements EmpleadoService {

    private final EmpleadoRepository empleadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final SucursalRepository sucursalRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Mapper ───────────────────────────────────────────────────────────────

    private EmpleadoResponse toResponse(Empleado e) {
        Sucursal suc = e.getSucursal();
        Usuario usr = e.getUsuario();
        return EmpleadoResponse.builder()
                .id(e.getId())
                .nombre(e.getNombre())
                .apellido(e.getApellido())
                .nombreCompleto(e.getNombreCompleto())
                .ci(e.getCi())
                .telefono(e.getTelefono())
                .correo(e.getCorreo())
                .cargo(e.getCargo())
                .turno(e.getTurno())
                .fechaIngreso(e.getFechaIngreso())
                .estado(e.getEstado())
                .sucursalId(suc != null ? suc.getId() : null)
                .sucursalNombre(suc != null ? suc.getNombre() : null)
                .usuarioId(usr != null ? usr.getId() : null)
                .username(usr != null ? usr.getUsername() : null)
                .rolNombre(usr != null && usr.getRol() != null ? usr.getRol().getNombre() : null)
                .creadoEn(e.getCreadoEn())
                .actualizadoEn(e.getActualizadoEn())
                .build();
    }

    // ── Métodos del servicio ──────────────────────────────────────────────────

    @Override
    @Transactional
    public EmpleadoResponse crear(EmpleadoRequest request) {
        if (empleadoRepository.existsByCi(request.getCi())) {
            throw new DuplicadoException("Ya existe un empleado con CI: " + request.getCi());
        }

        Rol rol = rolRepository.findById(request.getRolId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol", request.getRolId()));

        Sucursal sucursal = sucursalRepository.findById(request.getSucursalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", request.getSucursalId()));

        String username = resolverUsername(
                request.getUsernamePersonalizado(),
                request.getNombre(),
                request.getApellido());

        Empleado empleado = Empleado.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .ci(request.getCi())
                .telefono(request.getTelefono())
                .correo(request.getCorreo())
                .cargo(request.getCargo())
                .turno(request.getTurno())
                .fechaIngreso(request.getFechaIngreso())
                .sucursal(sucursal)
                .estado(EstadoEmpleado.ACTIVO)
                .build();

        empleado = empleadoRepository.save(empleado);

        Usuario usuario = Usuario.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPasswordInicial()))
                .rol(rol)
                .empleado(empleado)
                .activo(true)
                .intentosFallidos(0)
                .build();

        // Guardamos el usuario y lo asociamos al empleado para que toResponse lo vea
        usuario = usuarioRepository.save(usuario);
        empleado.setUsuario(usuario);

        return toResponse(empleado);
    }

    @Override
    @Transactional
    public EmpleadoResponse actualizar(Long id, EmpleadoRequest request) {
        Empleado empleado = buscarEntidadPorId(id);

        if (!empleado.getCi().equals(request.getCi())
                && empleadoRepository.existsByCi(request.getCi())) {
            throw new DuplicadoException("Ya existe un empleado con CI: " + request.getCi());
        }

        Sucursal sucursal = sucursalRepository.findById(request.getSucursalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", request.getSucursalId()));

        empleado.setNombre(request.getNombre());
        empleado.setApellido(request.getApellido());
        empleado.setCi(request.getCi());
        empleado.setTelefono(request.getTelefono());
        empleado.setCorreo(request.getCorreo());
        empleado.setCargo(request.getCargo());
        empleado.setTurno(request.getTurno());
        empleado.setSucursal(sucursal);

        if (request.getRolId() != null) {
            Rol nuevoRol = rolRepository.findById(request.getRolId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Rol", request.getRolId()));
            usuarioRepository.findByEmpleadoId(id)
                    .ifPresent(u -> { u.setRol(nuevoRol); usuarioRepository.save(u); });
        }

        return toResponse(empleadoRepository.save(empleado));
    }

    @Override
    @Transactional(readOnly = true)
    public EmpleadoResponse obtenerPorId(Long id) {
        return toResponse(buscarEntidadPorId(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmpleadoResponse> listarActivos() {
        return empleadoRepository.findByEstado(EstadoEmpleado.ACTIVO)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void desactivar(Long id) {
        Empleado empleado = buscarEntidadPorId(id);
        empleado.setEstado(EstadoEmpleado.INACTIVO);
        empleadoRepository.save(empleado);
        usuarioRepository.findByEmpleadoId(id)
                .ifPresent(u -> { u.setActivo(false); usuarioRepository.save(u); });
    }

    @Override
    @Transactional
    public void asignarRol(Long usuarioId, Long rolId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));
        Rol rol = rolRepository.findById(rolId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol", rolId));
        usuario.setRol(rol);
        usuarioRepository.save(usuario);
    }

    @Override
    @Transactional
    public void desbloquearUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));
        usuario.desbloquear();
        usuarioRepository.save(usuario);
    }

    @Override
    @Transactional
    public void cambiarPassword(Long usuarioId, String nuevaPassword) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));
        if (nuevaPassword == null || nuevaPassword.length() < 6) {
            throw new NegocioException("La contraseña debe tener al menos 6 caracteres");
        }
        usuario.setPasswordHash(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private Empleado buscarEntidadPorId(Long id) {
        return empleadoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Empleado", id));
    }

    private String resolverUsername(String usernamePersonalizado, String nombre, String apellido) {
        String username;
        if (usernamePersonalizado != null && !usernamePersonalizado.isBlank()) {
            username = usernamePersonalizado.trim().toLowerCase();
        } else {
            username = (nombre.trim() + "." + apellido.trim())
                    .toLowerCase()
                    .replaceAll("\\s+", "")
                    .replaceAll("[áàä]", "a")
                    .replaceAll("[éèë]", "e")
                    .replaceAll("[íìï]", "i")
                    .replaceAll("[óòö]", "o")
                    .replaceAll("[úùü]", "u")
                    .replaceAll("[ñ]", "n");
        }

        if (usuarioRepository.existsByUsername(username)) {
            throw new DuplicadoException("El username '" + username + "' ya está en uso. "
                    + "Por favor elija otro con el campo usernamePersonalizado.");
        }
        return username;
    }
}