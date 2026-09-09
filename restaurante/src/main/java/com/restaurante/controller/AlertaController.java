package com.restaurante.controller;

import com.restaurante.entity.AlertaSistema;
import com.restaurante.entity.Usuario;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.AlertaSistemaRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/alertas")
@RequiredArgsConstructor
@Tag(name = "Alertas", description = "Alertas del sistema: vencimientos, stock mínimo, bloqueos")
public class AlertaController {

    private final AlertaSistemaRepository alertaRepository;
    private final UsuarioRepository usuarioRepository;
    private final SucursalAccessService sucursalAccessService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar alertas no leídas (las de inventario se filtran por sucursal si corresponde)")
    public ResponseEntity<List<AlertaSistema>> listarNoLeidas(@RequestParam(required = false) Long sucursalId,
                                                                @AuthenticationPrincipal UserDetailsImpl userDetails) {
        Long efectiva = sucursalAccessService.resolver(userDetails, sucursalId);
        List<AlertaSistema> todas = alertaRepository.findByLeidaFalseOrderByCreadoEnDesc();
        if (efectiva == null) return ResponseEntity.ok(todas);
        return ResponseEntity.ok(todas.stream()
                .filter(a -> a.getSucursal() == null || efectiva.equals(a.getSucursal().getId()))
                .toList());
    }

    @GetMapping("/count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cantidad de alertas no leídas (para badge en UI)")
    public ResponseEntity<Map<String, Long>> contarNoLeidas() {
        return ResponseEntity.ok(Map.of("total", alertaRepository.countByLeidaFalse()));
    }

    @PatchMapping("/{id}/leer")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Marcar alerta como leída")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id,
                                             @AuthenticationPrincipal UserDetailsImpl userDetails) {
        AlertaSistema alerta = alertaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Alerta", id));

        Usuario usuario = usuarioRepository.findById(userDetails.getId()).orElse(null);
        alerta.setLeida(true);
        alerta.setLeidaEn(LocalDateTime.now());
        alerta.setLeidaPor(usuario);
        alertaRepository.save(alerta);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/leer-todas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> marcarTodasLeidas(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        Usuario usuario = usuarioRepository.findById(userDetails.getId()).orElse(null);
        List<AlertaSistema> noLeidas = alertaRepository.findByLeidaFalseOrderByCreadoEnDesc();
        noLeidas.forEach(a -> {
            a.setLeida(true);
            a.setLeidaEn(LocalDateTime.now());
            a.setLeidaPor(usuario);
        });
        alertaRepository.saveAll(noLeidas);
        return ResponseEntity.noContent().build();
    }
}
