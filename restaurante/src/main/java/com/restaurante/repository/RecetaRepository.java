package com.restaurante.repository;

import com.restaurante.entity.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecetaRepository extends JpaRepository<Receta, Long> {
    Optional<Receta> findByPlatoIdAndActivaTrue(Long platoId);
    List<Receta> findByPlatoIdOrderByVersionDesc(Long platoId);
    Optional<Receta> findTopByPlatoIdOrderByVersionDesc(Long platoId);

    @Query("SELECT DISTINCT r FROM Receta r JOIN FETCH r.plato LEFT JOIN FETCH r.ingredientes i LEFT JOIN FETCH i.insumo WHERE r.plato.id = :platoId AND r.activa = true")
    List<Receta> findActivaConIngredientesByPlatoId(@Param("platoId") Long platoId);

    @Query("SELECT DISTINCT r FROM Receta r JOIN FETCH r.plato LEFT JOIN FETCH r.ingredientes i LEFT JOIN FETCH i.insumo WHERE r.plato.id = :platoId ORDER BY r.version DESC")
    List<Receta> findByPlatoIdConIngredientesOrderByVersionDesc(@Param("platoId") Long platoId);

    @Query("SELECT DISTINCT r FROM Receta r JOIN FETCH r.plato LEFT JOIN FETCH r.ingredientes i LEFT JOIN FETCH i.insumo WHERE r.id = :id")
    List<Receta> findByIdConIngredientes(@Param("id") Long id);
}
