package com.restaurante.repository;

import com.restaurante.entity.ModuloMenu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuloMenuRepository extends JpaRepository<ModuloMenu, Long> {
    Optional<ModuloMenu> findByCodigo(String codigo);
    List<ModuloMenu> findByActivoTrueOrderByOrdenAsc();
    List<ModuloMenu> findBySistemaAndActivoTrueOrderByOrdenAsc(String sistema);
}
