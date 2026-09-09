package com.restaurante.repository;

import com.restaurante.entity.Cliente;
import com.restaurante.enums.EstadoCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    Optional<Cliente> findByTelefono(String telefono);
    Optional<Cliente> findByCorreo(String correo);
    boolean existsByTelefono(String telefono);
    boolean existsByCorreo(String correo);
    List<Cliente> findByEstado(EstadoCliente estado);
    List<Cliente> findByUltimaCompraBeforeAndEstadoNot(LocalDate fecha, EstadoCliente estado);
    List<Cliente> findByEstadoIn(List<EstadoCliente> estados);
}
