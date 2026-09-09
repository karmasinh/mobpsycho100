package com.restaurante.controller;

import com.restaurante.dto.request.ClienteRequest;
import com.restaurante.entity.Cliente;
import com.restaurante.enums.EstadoCliente;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.ClienteRepository;
import com.restaurante.repository.SucursalRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "Clientes ocasionales con seguimiento de estado y recuperación")
public class ClienteController {

    private final ClienteRepository clienteRepository;
    private final SucursalRepository sucursalRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('CAJERO','VENDEDOR','ADMIN') or @perm.tiene(authentication, 'MOD_CLIENTES')")
    @Operation(summary = "Registrar nuevo cliente")
    public ResponseEntity<Cliente> crear(@Valid @RequestBody ClienteRequest request) {
        if (request.getTelefono() != null
                && clienteRepository.existsByTelefono(request.getTelefono())) {
            throw new DuplicadoException("Ya existe un cliente con teléfono: " + request.getTelefono());
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
}
