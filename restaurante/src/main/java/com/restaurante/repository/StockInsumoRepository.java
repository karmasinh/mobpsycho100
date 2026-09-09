package com.restaurante.repository;

import com.restaurante.entity.StockInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockInsumoRepository extends JpaRepository<StockInsumo, Long> {

    Optional<StockInsumo> findByInsumo_IdAndSucursal_Id(Long insumoId, Long sucursalId);

    List<StockInsumo> findBySucursal_IdAndInsumo_ActivoTrue(Long sucursalId);

    /** Stock bajo en una sucursal concreta (compara dos campos de la misma entidad, no se puede como derived query) */
    @Query("""
        SELECT s FROM StockInsumo s
        WHERE s.sucursal.id = :sucursalId
          AND s.insumo.activo = true
          AND s.stockActual <= s.stockMinimo
    """)
    List<StockInsumo> findStockBajoPorSucursal(@Param("sucursalId") Long sucursalId);

    /** Stock bajo en todas las sucursales (lo usa el scheduler de alertas) */
    @Query("""
        SELECT s FROM StockInsumo s
        WHERE s.insumo.activo = true
          AND s.stockActual <= s.stockMinimo
    """)
    List<StockInsumo> findStockBajoGlobal();

    /** Suma del stock de un insumo entre todas las sucursales — lo usa el costeo promedio ponderado (global) */
    @Query("SELECT COALESCE(SUM(s.stockActual), 0) FROM StockInsumo s WHERE s.insumo.id = :insumoId")
    Double sumStockGlobal(@Param("insumoId") Long insumoId);
}
