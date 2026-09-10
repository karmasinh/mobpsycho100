package com.restaurante.repository;

import com.restaurante.entity.UnidadMedida;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UnidadMedidaRepository extends JpaRepository<UnidadMedida, Long> {
    Optional<UnidadMedida> findByCodigo(String codigo);
}
