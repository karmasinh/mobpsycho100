package com.restaurante.controller;

import com.restaurante.dto.response.RentabilidadPlatoDto;
import com.restaurante.dto.response.TopProductoDto;
import com.restaurante.dto.response.VentaPorSucursalDto;
import com.restaurante.entity.Venta;
import com.restaurante.enums.FormaPago;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.VentaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ventas")
@RequiredArgsConstructor
@Tag(name = "Ventas", description = "Cobro, anulación y reportes de ventas")
public class VentaController {

    private final VentaService ventaService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping("/cobrar/{pedidoId}")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Cobrar un pedido y generar la venta")
    public ResponseEntity<Venta> cobrar(
            @PathVariable Long pedidoId,
            @RequestParam Double montoRecibido,
            @RequestParam FormaPago formaPago,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ventaService.cobrar(pedidoId, montoRecibido, formaPago, user.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN','GERENTE_SUCURSAL') "
            + "or @perm.tiene(authentication, 'MOD_CAJA') or @perm.tiene(authentication, 'MOD_REPORTES')")
    public ResponseEntity<Venta> obtener(@PathVariable Long id,
                                          @AuthenticationPrincipal UserDetailsImpl user) {
        Venta venta = ventaService.obtenerPorId(id);
        sucursalAccessService.verificarPertenece(user, venta.getSucursal().getId());
        return ResponseEntity.ok(venta);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_REPORTES')")
    @Operation(summary = "Listar ventas en rango de fechas")
    public ResponseEntity<List<Venta>> listar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Long sucursalId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(ventaService.listarEntreFechas(desde, hasta, efectiva));
    }

    @GetMapping("/total")
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_REPORTES')")
    @Operation(summary = "Total recaudado en un rango de fechas")
    public ResponseEntity<Map<String, Double>> total(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Long sucursalId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(Map.of("total", ventaService.totalEntreFechas(desde, hasta, efectiva)));
    }

    @GetMapping("/top-productos")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_REPORTES')")
    @Operation(summary = "Top productos más vendidos en un rango de fechas")
    public ResponseEntity<List<TopProductoDto>> topProductos(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) Long sucursalId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(ventaService.topProductos(desde, hasta, limit, efectiva));
    }

    @GetMapping("/rentabilidad")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_REPORTES')")
    @Operation(summary = "Rentabilidad estimada por plato en un rango de fechas (ingresos vs. costo de receta activa)")
    public ResponseEntity<List<RentabilidadPlatoDto>> rentabilidad(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Long sucursalId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(ventaService.rentabilidadPorPlato(desde, hasta, efectiva));
    }

    @GetMapping("/comparativo-sucursales")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Total de ventas por sucursal en un rango de fechas — alcance global, solo ADMIN (RN-A-014)")
    public ResponseEntity<List<VentaPorSucursalDto>> comparativoSucursales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(ventaService.comparativoPorSucursal(desde, hasta));
    }

    @PatchMapping("/{id}/anular")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Anular una venta directamente (requiere motivo) — ADMIN únicamente; los demás roles deben solicitarlo vía /solicitudes-aprobacion")
    public ResponseEntity<Void> anular(@PathVariable Long id,
                                        @RequestBody Map<String, String> body,
                                        @AuthenticationPrincipal UserDetailsImpl user) {
        ventaService.anular(id, body.get("motivo"), user.getId());
        return ResponseEntity.noContent().build();
    }
}
