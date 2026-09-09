package com.restaurante.repository;

import com.restaurante.entity.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {
    Optional<Proveedor> findByNit(String nit);
    boolean existsByNit(String nit);
    boolean existsByNombre(String nombre);
    List<Proveedor> findByActivoTrue();
}
