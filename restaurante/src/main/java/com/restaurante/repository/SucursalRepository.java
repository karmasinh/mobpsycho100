package com.restaurante.repository;

import com.restaurante.entity.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SucursalRepository extends JpaRepository<Sucursal, Long> {
    Optional<Sucursal> findByNombre(String nombre);
    boolean existsByNombre(String nombre);
    List<Sucursal> findByActivoTrue();
}
