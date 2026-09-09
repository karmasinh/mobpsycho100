package com.restaurante.repository;

import com.restaurante.entity.TipoAlmuerzo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TipoAlmuerzoRepository extends JpaRepository<TipoAlmuerzo, Long> {
    Optional<TipoAlmuerzo> findByNombre(String nombre);
    boolean existsByNombre(String nombre);
    List<TipoAlmuerzo> findByActivoTrue();
}
