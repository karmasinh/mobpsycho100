package com.restaurante.repository;

import com.restaurante.entity.CategoriaPlato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaPlatoRepository extends JpaRepository<CategoriaPlato, Long> {
    List<CategoriaPlato> findByActivoTrue();
    boolean existsByNombre(String nombre);
}
