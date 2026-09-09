package com.restaurante.repository;

import com.restaurante.entity.CategoriaInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaInsumoRepository extends JpaRepository<CategoriaInsumo, Long> {
    List<CategoriaInsumo> findByActivoTrue();
    boolean existsByNombre(String nombre);
}
