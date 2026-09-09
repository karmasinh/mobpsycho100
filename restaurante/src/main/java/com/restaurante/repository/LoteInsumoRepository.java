package com.restaurante.repository;

import com.restaurante.entity.LoteInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LoteInsumoRepository extends JpaRepository<LoteInsumo, Long> {

    /**
     * FEFO: obtiene lotes activos con stock disponible de una sucursal, ordenados por
     * fecha de vencimiento ascendente. Los lotes sin fecha de vencimiento van al final.
     */
    @Query("""
        SELECT l FROM LoteInsumo l
        WHERE l.insumo.id = :insumoId
          AND l.sucursal.id = :sucursalId
          AND l.activo = true
          AND l.cantidadDisponible > 0
        ORDER BY COALESCE(l.fechaVencimiento, '9999-12-31') ASC
    """)
    List<LoteInsumo> findLotesFEFO(@Param("insumoId") Long insumoId, @Param("sucursalId") Long sucursalId);

    /**
     * Lotes próximos a vencer en los próximos N días (opcionalmente filtrado por sucursal).
     */
    @Query("""
        SELECT l FROM LoteInsumo l
        WHERE l.activo = true
          AND l.cantidadDisponible > 0
          AND l.fechaVencimiento IS NOT NULL
          AND l.fechaVencimiento <= :fechaLimite
          AND (:sucursalId IS NULL OR l.sucursal.id = :sucursalId)
        ORDER BY l.fechaVencimiento ASC
    """)
    List<LoteInsumo> findLotesProximosVencer(@Param("fechaLimite") LocalDate fechaLimite,
                                              @Param("sucursalId") Long sucursalId);

    List<LoteInsumo> findByInsumoIdAndActivoTrue(Long insumoId);
}
