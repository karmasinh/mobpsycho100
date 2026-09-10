package com.restaurante.controller;

import com.restaurante.dto.request.ClienteRequest;
import com.restaurante.entity.AuditoriaLog;
import com.restaurante.entity.Cliente;
import com.restaurante.enums.EstadoCliente;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.AuditoriaLogRepository;
import com.restaurante.repository.ClienteRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "Clientes ocasionales con seguimiento de estado y recuperación")
public class ClienteController {

    private final ClienteRepository clienteRepository;
    private final SucursalRepository sucursalRepository;
    private final AuditoriaLogRepository auditoriaLogRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CLIENTES')")
    @Operation(summary = "Registrar nuevo cliente")
    public ResponseEntity<Cliente> crear(@Valid @RequestBody ClienteRequest request) {
        if (request.getTelefono() != null
                && clienteRepository.existsByTelefono(request.getTelefono())) {
            throw new DuplicadoException("Ya existe un cliente con teléfono: " + request.getTelefono());
        }
        if (request.getCorreo() != null
                && !request.getCorreo().isBlank()
                && clienteRepository.existsByCorreo(request.getCorreo())) {
            throw new DuplicadoException("Ya existe un cliente con correo: " + request.getCorreo());
        }

        var sucursal = request.getSucursalId() != null
                ? sucursalRepository.findById(request.getSucursalId()).orElse(null)
                : null;

        Cliente cliente = Cliente.builder()
                .nombre(request.getNombre())
                .telefono(request.getTelefono())
                .correo(request.getCorreo())
                .sucursal(sucursal)
                .fechaRegistro(LocalDate.now())
                .estado(EstadoCliente.CLIENTE_NUEVO)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(clienteRepository.save(cliente));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Cliente> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(clienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente", id)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CLIENTES')")
    public ResponseEntity<List<Cliente>> listar() {
        return ResponseEntity.ok(clienteRepository.findAll());
    }

    @GetMapping("/estado/{estado}")
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CLIENTES')")
    @Operation(summary = "Filtrar clientes por estado (ACTIVO, INACTIVO, RECUPERADO, etc.)")
    public ResponseEntity<List<Cliente>> listarPorEstado(@PathVariable EstadoCliente estado) {
        return ResponseEntity.ok(clienteRepository.findByEstado(estado));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_CLIENTES')")
    @Operation(summary = "Editar datos de un cliente existente (corrección de datos erróneos)")
    public ResponseEntity<Cliente> actualizar(@PathVariable Long id,
                                               @Valid @RequestBody ClienteRequest request,
                                               @AuthenticationPrincipal UserDetailsImpl user) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente", id));

        if (request.getTelefono() != null && !request.getTelefono().isBlank()
                && !request.getTelefono().equals(cliente.getTelefono())
                && clienteRepository.existsByTelefono(request.getTelefono())) {
            throw new DuplicadoException("Ya existe un cliente con teléfono: " + request.getTelefono());
        }
        if (request.getCorreo() != null && !request.getCorreo().isBlank()
                && !request.getCorreo().equals(cliente.getCorreo())
                && clienteRepository.existsByCorreo(request.getCorreo())) {
            throw new DuplicadoException("Ya existe un cliente con correo: " + request.getCorreo());
        }

        String valorAnterior = "nombre=" + cliente.getNombre()
                + ", telefono=" + cliente.getTelefono()
                + ", correo=" + cliente.getCorreo();

        cliente.setNombre(request.getNombre());
        cliente.setTelefono(request.getTelefono());
        cliente.setCorreo(request.getCorreo());
        if (request.getSucursalId() != null
                && (cliente.getSucursal() == null || !Objects.equals(cliente.getSucursal().getId(), request.getSucursalId()))) {
            cliente.setSucursal(sucursalRepository.findById(request.getSucursalId()).orElse(cliente.getSucursal()));
        }

        Cliente actualizado = clienteRepository.save(cliente);

        String valorNuevo = "nombre=" + actualizado.getNombre()
                + ", telefono=" + actualizado.getTelefono()
                + ", correo=" + actualizado.getCorreo();

        auditoriaLogRepository.save(AuditoriaLog.builder()
                .entidad("Cliente")
                .entidadId(actualizado.getId())
                .accion("EDICION")
                .sucursal(actualizado.getSucursal())
                .valorAnterior(valorAnterior)
                .valorNuevo(valorNuevo)
                .username(user.getUsername())
                .build());

        return ResponseEntity.ok(actualizado);
    }
}
