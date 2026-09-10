package com.restaurante.controller;

import com.restaurante.dto.request.EmpresaRequest;
import com.restaurante.entity.Empresa;
import com.restaurante.repository.EmpresaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/empresa")
@RequiredArgsConstructor
@Tag(name = "Empresa", description = "Perfil único del negocio — su ausencia dispara el asistente de bienvenida")
public class EmpresaController {

    private final EmpresaRepository empresaRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtener el perfil de la empresa (404 si aún no se creó)")
    public ResponseEntity<Empresa> obtener() {
        return empresaRepository.findAll().stream().findFirst()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ADMIN')")
    @Operation(summary = "Crear o actualizar el perfil de la empresa")
    public ResponseEntity<Empresa> guardar(@Valid @RequestBody EmpresaRequest request) {
        Empresa empresa = empresaRepository.findAll().stream().findFirst()
                .orElseGet(Empresa::new);
        empresa.setNombre(request.getNombre());
        empresa.setNit(request.getNit());
        empresa.setDireccion(request.getDireccion());
        empresa.setTelefono(request.getTelefono());
        empresa.setLogoUrl(request.getLogoUrl());
        return ResponseEntity.ok(empresaRepository.save(empresa));
    }
}
