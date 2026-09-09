package com.restaurante.controller;

import com.restaurante.dto.request.PedidoRequest;
import com.restaurante.entity.Pedido;
import com.restaurante.enums.EstadoPedido;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.PedidoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pedidos")
@RequiredArgsConstructor
@Tag(name = "Pedidos", description = "Máquina de estados: PENDIENTE → EN_PREPARACION → LISTO → ENTREGADO")
public class PedidoController {

    private final PedidoService pedidoService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    @Operation(summary = "Crear nuevo pedido")
    public ResponseEntity<Pedido> crear(@Valid @RequestBody PedidoRequest request,
                                         @AuthenticationPrincipal UserDetailsImpl user) {
        request.setSucursalId(sucursalAccessService.resolver(user, request.getSucursalId()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pedidoService.crear(request, user.getId()));
    }

    private static final String ROLES_PEDIDOS =
            "hasAnyRole('CAJERO','VENDEDOR','COCINERO','JEFE_COCINA','ADMIN') "
                    + "or @perm.tiene(authentication, 'MOD_CAJA') "
                    + "or @perm.tiene(authentication, 'MOD_PEDIDOS_COCINA')";

    @GetMapping("/{id}")
    @PreAuthorize(ROLES_PEDIDOS)
    public ResponseEntity<Pedido> obtener(@PathVariable Long id,
                                           @AuthenticationPrincipal UserDetailsImpl user) {
        Pedido pedido = pedidoService.obtenerPorId(id);
        sucursalAccessService.verificarPertenece(user, pedido.getSucursal().getId());
        return ResponseEntity.ok(pedido);
    }

    @GetMapping("/estado/{estado}")
    @PreAuthorize(ROLES_PEDIDOS)
    @Operation(summary = "Listar pedidos por estado — cocina usa EN_PREPARACION y LISTO")
    public ResponseEntity<List<Pedido>> listarPorEstado(@PathVariable EstadoPedido estado,
                                                          @RequestParam(required = false) Long sucursalId,
                                                          @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(pedidoService.listarPorEstado(estado, efectiva));
    }

    @GetMapping("/cliente/{clienteId}")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    public ResponseEntity<List<Pedido>> listarPorCliente(@PathVariable Long clienteId) {
        return ResponseEntity.ok(pedidoService.listarPorCliente(clienteId));
    }

    @GetMapping("/activos/sucursal/{sucursalId}")
    @PreAuthorize(ROLES_PEDIDOS)
    public ResponseEntity<List<Pedido>> listarActivos(@PathVariable Long sucursalId,
                                                        @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(pedidoService.listarActivos(efectiva));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(ROLES_PEDIDOS)
    @Operation(summary = "Avanzar estado del pedido (cocina: PENDIENTE→EN_PREPARACION→LISTO)")
    public ResponseEntity<Pedido> cambiarEstado(@PathVariable Long id,
                                                 @RequestParam EstadoPedido nuevoEstado,
                                                 @AuthenticationPrincipal UserDetailsImpl user) {
        Pedido actual = pedidoService.obtenerPorId(id);
        sucursalAccessService.verificarPertenece(user, actual.getSucursal().getId());
        return ResponseEntity.ok(pedidoService.cambiarEstado(id, nuevoEstado, user.getId()));
    }

    @PatchMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')")
    public ResponseEntity<Void> cancelar(@PathVariable Long id,
                                          @AuthenticationPrincipal UserDetailsImpl user) {
        pedidoService.cancelar(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
