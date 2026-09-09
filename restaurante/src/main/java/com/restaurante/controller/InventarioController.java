package com.restaurante.controller;

import com.restaurante.dto.response.StockInsumoDto;
import com.restaurante.entity.LoteInsumo;
import com.restaurante.entity.MovimientoInventario;
import com.restaurante.enums.TipoMovimientoInventario;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.InventarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/inventario")
@RequiredArgsConstructor
@Tag(name = "Inventario", description = "Ingresos, consumo FEFO y alertas de stock, por sucursal")
public class InventarioController {

    private final InventarioService inventarioService;
    private final SucursalAccessService sucursalAccessService;

    @GetMapping("/stock")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Stock vivo de insumos en una sucursal")
    public ResponseEntity<List<StockInsumoDto>> stock(@RequestParam(required = false) Long sucursalId,
                                                        @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(inventarioService.listarStockPorSucursal(efectiva));
    }

    @PostMapping("/insumos/{insumoId}/lote")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Ingresar lote de insumo al inventario de una sucursal")
    public ResponseEntity<LoteInsumo> ingresarLote(
            @PathVariable Long insumoId,
            @RequestParam(required = false) Long sucursalId,
            @RequestParam(required = false) Long proveedorId,
            @RequestParam(required = false) String numeroLote,
            @RequestParam Double cantidad,
            @RequestParam Double precioUnitario,
            @RequestParam(required = false) LocalDate fechaVencimiento,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventarioService.ingresarLote(
                        insumoId, efectiva, proveedorId, numeroLote,
                        cantidad, precioUnitario, fechaVencimiento, user.getId()));
    }

    @PostMapping("/insumos/{insumoId}/consumir")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Consumir stock de una sucursal (FEFO automático)")
    public ResponseEntity<Void> consumirStock(
            @PathVariable Long insumoId,
            @RequestParam(required = false) Long sucursalId,
            @RequestParam Double cantidad,
            @RequestParam(required = false, defaultValue = "Consumo en producción") String motivo,
            @RequestParam(required = false, defaultValue = "CONSUMO_PRODUCCION") TipoMovimientoInventario tipo,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        inventarioService.consumirStock(insumoId, efectiva, cantidad, motivo, tipo, user.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stock-bajo")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Insumos con stock por debajo del mínimo en una sucursal")
    public ResponseEntity<List<StockInsumoDto>> stockBajo(@RequestParam(required = false) Long sucursalId,
                                                            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(inventarioService.listarConStockBajo(efectiva));
    }

    @GetMapping("/vencimientos")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Lotes próximos a vencer (días configurable, default 15)")
    public ResponseEntity<List<LoteInsumo>> vencimientos(
            @RequestParam(defaultValue = "15") int dias,
            @RequestParam(required = false) Long sucursalId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(inventarioService.listarLotesProximosVencer(dias, efectiva));
    }

    @GetMapping("/insumos/{insumoId}/movimientos")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Historial de movimientos de un insumo")
    public ResponseEntity<List<MovimientoInventario>> movimientos(@PathVariable Long insumoId,
                                                                    @RequestParam(required = false) Long sucursalId,
                                                                    @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(inventarioService.historialMovimientos(insumoId, efectiva));
    }

    @PatchMapping("/insumos/{insumoId}/ajustar")
    @PreAuthorize("hasAnyRole('JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Ajuste manual de stock (inventario físico) en una sucursal")
    public ResponseEntity<Void> ajustar(
            @PathVariable Long insumoId,
            @RequestParam(required = false) Long sucursalId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Double nuevaCantidad = ((Number) body.get("cantidad")).doubleValue();
        String motivo = (String) body.getOrDefault("motivo", "Ajuste manual");
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        inventarioService.ajustarStock(insumoId, efectiva, nuevaCantidad, motivo, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/insumos/{insumoId}/stock-minimo")
    @PreAuthorize("hasAnyRole('JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_INVENTARIO')")
    @Operation(summary = "Fija el stock mínimo de un insumo en una sucursal")
    public ResponseEntity<Void> ajustarStockMinimo(
            @PathVariable Long insumoId,
            @RequestParam(required = false) Long sucursalId,
            @RequestParam Double valor,
            @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        inventarioService.ajustarStockMinimo(insumoId, efectiva, valor, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ─── Mermas ──────────────────────────────────────────────────

    @PostMapping("/insumos/{insumoId}/merma")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_MERMAS')")
    @Operation(summary = "Registrar merma de un insumo en una sucursal")
    public ResponseEntity<Map<String, Object>> registrarMerma(
            @PathVariable Long insumoId,
            @RequestParam(required = false) Long sucursalId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Double cantidad     = ((Number) body.get("cantidad")).doubleValue();
        String causa        = (String) body.getOrDefault("causa", "Sin causa especificada");
        String observaciones = (String) body.get("observaciones");

        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        MovimientoInventario m = inventarioService.registrarMerma(insumoId, efectiva, cantidad, causa, observaciones, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(mermaToMap(m));
    }

    @GetMapping("/mermas")
    @PreAuthorize("hasAnyRole('JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_MERMAS')")
    @Operation(summary = "Listar mermas registradas en una sucursal")
    public ResponseEntity<List<Map<String, Object>>> listarMermas(@RequestParam(required = false) Long sucursalId,
                                                                    @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(
                inventarioService.listarMermas(efectiva).stream().map(this::mermaToMap).toList()
        );
    }

    @GetMapping("/insumos/{insumoId}/mermas")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_MERMAS')")
    @Operation(summary = "Listar mermas de un insumo en una sucursal")
    public ResponseEntity<List<Map<String, Object>>> listarMermasPorInsumo(@PathVariable Long insumoId,
                                                                             @RequestParam(required = false) Long sucursalId,
                                                                             @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(
                inventarioService.listarMermasPorInsumo(insumoId, efectiva).stream().map(this::mermaToMap).toList()
        );
    }

    // ─── Kárdex ──────────────────────────────────────────────────

    @GetMapping("/insumos/{insumoId}/kardex")
    @PreAuthorize("hasAnyRole('JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_KARDEX')")
    @Operation(summary = "Kárdex de un insumo en una sucursal para un período")
    public ResponseEntity<Map<String, Object>> kardex(
            @PathVariable Long insumoId,
            @RequestParam(required = false) Long sucursalId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(inventarioService.obtenerKardex(insumoId, efectiva, desde, hasta));
    }

    // ─── helpers ─────────────────────────────────────────────────

    private Map<String, Object> mermaToMap(MovimientoInventario m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id",             m.getId());
        map.put("insumoId",       m.getInsumo().getId());
        map.put("insumoNombre",   m.getInsumo().getNombre());
        map.put("insumoUnidad",   m.getInsumo().getUnidadMedida());
        map.put("fecha",          m.getCreadoEn().toLocalDate().toString());
        map.put("hora",           m.getCreadoEn().toLocalTime().toString());
        map.put("cantidad",       m.getCantidad());
        map.put("causa",          m.getMotivo() != null ? m.getMotivo() : "");
        map.put("observaciones",  m.getObservaciones() != null ? m.getObservaciones() : "");
        map.put("valorEconomico", m.getValorEconomico() != null ? m.getValorEconomico() : 0.0);
        map.put("usuario",        m.getUsuario() != null ? m.getUsuario().getUsername() : null);
        return map;
    }
}
