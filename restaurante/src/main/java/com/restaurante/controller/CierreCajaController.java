package com.restaurante.controller;

import com.restaurante.entity.CierreCaja;
import com.restaurante.entity.MovimientoCaja;
import com.restaurante.enums.TipoMovimientoCaja;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.CierreCajaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cierres-caja")
@RequiredArgsConstructor
@Tag(name = "Cierre de caja", description = "Apertura y cierre de turnos de caja, arqueo de efectivo")
public class CierreCajaController {

    private final CierreCajaService cierreCajaService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping("/abrir")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Abre un turno de caja con un monto inicial de efectivo")
    public ResponseEntity<CierreCaja> abrir(@RequestParam(required = false) Long sucursalId,
                                             @RequestParam Double montoInicial,
                                             @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cierreCajaService.abrir(efectiva, montoInicial, user.getId()));
    }

    @PatchMapping("/{id}/cerrar")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Cierra un turno de caja declarando el efectivo contado")
    public ResponseEntity<CierreCaja> cerrar(@PathVariable Long id,
                                              @RequestBody Map<String, Object> body,
                                              @AuthenticationPrincipal UserDetailsImpl user) {
        Double montoFinalDeclarado = ((Number) body.get("montoFinalDeclarado")).doubleValue();
        String observaciones = (String) body.get("observaciones");
        return ResponseEntity.ok(cierreCajaService.cerrar(id, montoFinalDeclarado, observaciones, user.getId()));
    }

    @GetMapping("/abierto")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Turno de caja abierto del usuario autenticado (si tiene uno)")
    public ResponseEntity<CierreCaja> abierto(@AuthenticationPrincipal UserDetailsImpl user) {
        return cierreCajaService.obtenerAbiertoPorCajero(user.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    public ResponseEntity<CierreCaja> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(cierreCajaService.obtenerPorId(id));
    }

    @PostMapping("/{id}/movimientos")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Registra un ingreso o retiro de efectivo dentro del turno")
    public ResponseEntity<MovimientoCaja> registrarMovimiento(@PathVariable Long id,
                                                                @RequestBody Map<String, Object> body,
                                                                @AuthenticationPrincipal UserDetailsImpl user) {
        TipoMovimientoCaja tipo = TipoMovimientoCaja.valueOf((String) body.get("tipo"));
        Double monto = ((Number) body.get("monto")).doubleValue();
        String motivo = (String) body.get("motivo");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cierreCajaService.registrarMovimiento(id, tipo, monto, motivo, user.getId()));
    }

    @GetMapping("/{id}/movimientos")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Lista los movimientos (ingresos/retiros) de un turno")
    public ResponseEntity<List<MovimientoCaja>> listarMovimientos(@PathVariable Long id) {
        return ResponseEntity.ok(cierreCajaService.listarMovimientos(id));
    }

    @PatchMapping("/movimientos/{id}/revertir")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Revierte un movimiento de caja (crea uno inverso, requiere turno abierto) — solo ADMIN")
    public ResponseEntity<MovimientoCaja> revertirMovimiento(@PathVariable Long id,
                                                               @RequestBody Map<String, String> body,
                                                               @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(cierreCajaService.revertirMovimiento(id, body.get("motivo"), user.getId()));
    }

    @GetMapping("/sucursal/{sucursalId}")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Historial de turnos de caja de una sucursal")
    public ResponseEntity<List<CierreCaja>> listarPorSucursal(@PathVariable Long sucursalId,
                                                                @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(cierreCajaService.listarPorSucursal(efectiva));
    }
}
