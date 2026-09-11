package com.restaurante.controller;

import com.restaurante.dto.request.ConfiguracionTicketRequest;
import com.restaurante.entity.ConfiguracionTicket;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.ConfiguracionTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/configuracion-ticket")
@RequiredArgsConstructor
@Tag(name = "Configuración de ticket", description = "Comprobante de venta impreso al cliente, por sucursal")
public class ConfiguracionTicketController {

    private final ConfiguracionTicketService configuracionTicketService;
    private final SucursalAccessService sucursalAccessService;

    @GetMapping("/{sucursalId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Configuración del ticket de la sucursal (valores por defecto si no se configuró)")
    public ResponseEntity<ConfiguracionTicket> obtener(@PathVariable Long sucursalId,
                                                         @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(configuracionTicketService.obtener(efectiva));
    }

    @PutMapping("/{sucursalId}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_CONFIG_TICKET')")
    @Operation(summary = "Guardar la configuración del ticket de la sucursal")
    public ResponseEntity<ConfiguracionTicket> guardar(@PathVariable Long sucursalId,
                                                         @Valid @RequestBody ConfiguracionTicketRequest request,
                                                         @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(configuracionTicketService.guardar(efectiva, request));
    }
}
