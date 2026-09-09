package com.restaurante.repository;

import com.restaurante.entity.Plato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatoRepository extends JpaRepository<Plato, Long> {
    Optional<Plato> findByCodigo(String codigo);
    boolean existsByCodigo(String codigo);
    List<Plato> findByActivoTrue();
    List<Plato> findByTipoAndActivoTrue(String tipo);
}
