package com.restaurante.repository;

import com.restaurante.entity.Insumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InsumoRepository extends JpaRepository<Insumo, Long> {
    Optional<Insumo> findByCodigo(String codigo);
    boolean existsByCodigo(String codigo);
    List<Insumo> findByActivoTrue();
}
