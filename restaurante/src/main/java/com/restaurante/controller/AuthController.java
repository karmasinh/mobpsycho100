package com.restaurante.controller;

import com.restaurante.dto.request.LoginRequest;
import com.restaurante.dto.response.LoginResponse;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Login, logout y reconocimiento de rol")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión y obtener token JWT con módulos asignados al rol")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Registrar cierre de sesión en auditoría")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails != null) {
            authService.logout(userDetails.getUsername());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Obtener información del usuario autenticado y sus módulos")
    public ResponseEntity<LoginResponse> me(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        // Devuelve info del usuario logueado sin regenerar token
        LoginResponse info = LoginResponse.builder()
                .usuarioId(userDetails.getId())
                .username(userDetails.getUsername())
                .rol(userDetails.getRolNombre())
                .modulos(userDetails.getModulos().stream()
                        .map(codigo -> LoginResponse.ModuloMenuDto.builder()
                                .codigo(codigo).build())
                        .toList())
                .build();
        return ResponseEntity.ok(info);
    }
}
