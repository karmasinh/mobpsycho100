package com.restaurante.service.impl;

import com.restaurante.dto.request.LoginRequest;
import com.restaurante.dto.response.LoginResponse;
import com.restaurante.entity.AuditoriaLog;
import com.restaurante.entity.ModuloMenu;
import com.restaurante.entity.Usuario;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.exception.UsuarioBloqueadoException;
import com.restaurante.repository.AuditoriaLogRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.security.jwt.JwtUtils;
import com.restaurante.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuditoriaLogRepository auditoriaLogRepository;

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {

        Usuario usuario = usuarioRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Usuario no encontrado: " + request.getUsername()));

        // Verificar si está bloqueado
        if (usuario.estaBloqueado()) {
            throw new UsuarioBloqueadoException(usuario.getUsername());
        }

        // Verificar contraseña
        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            usuario.registrarIntentoFallido();
            usuarioRepository.save(usuario);

            if (usuario.estaBloqueado()) {
                registrarAuditoria("Usuario", usuario.getId(), "BLOQUEO_AUTOMATICO",
                        usuario.getUsername(), null);
                throw new UsuarioBloqueadoException(usuario.getUsername());
            }

            int intentosRestantes = 3 - usuario.getIntentosFallidos();
            throw new BadCredentialsException(
                    "Credenciales inválidas. Intentos restantes: " + intentosRestantes);
        }

        // Login exitoso
        usuario.registrarAccesoExitoso();
        usuarioRepository.save(usuario);

        registrarAuditoria("Usuario", usuario.getId(), "LOGIN_EXITOSO",
                null, usuario.getUsername());

        // Construir módulos para el token y la respuesta
        List<String> codigosModulos = usuario.getRol().getModulos().stream()
                .filter(m -> Boolean.TRUE.equals(m.getActivo()))
                .map(ModuloMenu::getCodigo)
                .toList();

        List<LoginResponse.ModuloMenuDto> modulosDto = usuario.getRol().getModulos().stream()
                .filter(m -> Boolean.TRUE.equals(m.getActivo()))
                .sorted(Comparator.comparingInt(ModuloMenu::getOrden))
                .map(m -> LoginResponse.ModuloMenuDto.builder()
                        .id(m.getId())
                        .codigo(m.getCodigo())
                        .nombre(m.getNombre())
                        .icono(m.getIcono())
                        .ruta(m.getRuta())
                        .orden(m.getOrden())
                        .padreId(m.getPadre() != null ? m.getPadre().getId() : null)
                        .sistema(m.getSistema())
                        .activo(m.getActivo())
                        .build())
                .toList();

        // Determinar sistema principal del rol (COCINA, VENTAS, ADMIN)
        String sistema = determinarSistema(usuario.getRol().getNombre());

        // Sucursal fija del usuario (vía Empleado.sucursal); null = admin/multi-sucursal
        Long sucursalId = null;
        String sucursalNombre = null;
        if (usuario.getEmpleado() != null && usuario.getEmpleado().getSucursal() != null) {
            sucursalId = usuario.getEmpleado().getSucursal().getId();
            sucursalNombre = usuario.getEmpleado().getSucursal().getNombre();
        }

        String token = jwtUtils.generarToken(
                usuario.getUsername(),
                usuario.getRol().getNombre(),
                codigosModulos);

        return LoginResponse.builder()
                .token(token)
                .tipo("Bearer")
                .usuarioId(usuario.getId())
                .username(usuario.getUsername())
                .rol(usuario.getRol().getNombre())
                .sistema(sistema)
                .sucursalId(sucursalId)
                .sucursalNombre(sucursalNombre)
                .modulos(modulosDto)
                .build();
    }

    @Override
    @Transactional
    public void logout(String username) {
        registrarAuditoria("Usuario", null, "LOGOUT", username, null);
    }

    // ─── helpers ──────────────────────────────────────────────────

    private String determinarSistema(String rolNombre) {
        String rol = rolNombre.toUpperCase();
        if (rol.contains("COCINERO") || rol.contains("JEFE_COCINA") || rol.contains("ALMACENERO")) {
            return "COCINA";
        }
        if (rol.contains("CAJERO") || rol.contains("VENDEDOR")) {
            return "VENTAS";
        }
        return "ADMIN";
    }

    private void registrarAuditoria(String entidad, Long entidadId,
                                     String accion, String valorAnterior, String valorNuevo) {
        auditoriaLogRepository.save(AuditoriaLog.builder()
                .entidad(entidad)
                .entidadId(entidadId)
                .accion(accion)
                .valorAnterior(valorAnterior)
                .valorNuevo(valorNuevo)
                .username(valorNuevo != null ? valorNuevo : valorAnterior)
                .build());
    }
}
