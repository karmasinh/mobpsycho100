package com.restaurante.repository;

import com.restaurante.entity.MovimientoInventario;
import com.restaurante.enums.TipoMovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    /** Historial de movimientos de un insumo, opcionalmente filtrado por sucursal */
    @Query("""
        SELECT m FROM MovimientoInventario m
        WHERE m.insumo.id = :insumoId
          AND (:sucursalId IS NULL OR m.sucursal.id = :sucursalId)
        ORDER BY m.creadoEn DESC
        """)
    List<MovimientoInventario> findByInsumoIdOrderByCreadoEnDesc(@Param("insumoId") Long insumoId,
                                                                  @Param("sucursalId") Long sucursalId);

    /** Todas las mermas (con insumo y usuario cargados, evita N+1), opcionalmente filtrado por sucursal */
    @Query("""
        SELECT m FROM MovimientoInventario m
        JOIN FETCH m.insumo
        LEFT JOIN FETCH m.usuario
        WHERE m.tipo = :tipo
          AND (:sucursalId IS NULL OR m.sucursal.id = :sucursalId)
        ORDER BY m.creadoEn DESC
        """)
    List<MovimientoInventario> findByTipoConInsumoYUsuario(@Param("tipo") TipoMovimientoInventario tipo,
                                                             @Param("sucursalId") Long sucursalId);

    /** Mermas de un insumo específico, opcionalmente filtrado por sucursal */
    @Query("""
        SELECT m FROM MovimientoInventario m
        WHERE m.insumo.id = :insumoId
          AND m.tipo = :tipo
          AND (:sucursalId IS NULL OR m.sucursal.id = :sucursalId)
        ORDER BY m.creadoEn DESC
        """)
    List<MovimientoInventario> findByInsumoIdAndTipoOrderByCreadoEnDesc(@Param("insumoId") Long insumoId,
                                                                         @Param("tipo") TipoMovimientoInventario tipo,
                                                                         @Param("sucursalId") Long sucursalId);

    /** Movimientos de un insumo en una sucursal, en el rango [desde, hasta] — para el Kárdex */
    @Query("""
        SELECT m FROM MovimientoInventario m
        LEFT JOIN FETCH m.usuario
        WHERE m.insumo.id = :insumoId
          AND m.sucursal.id = :sucursalId
          AND m.creadoEn BETWEEN :desde AND :hasta
        ORDER BY m.creadoEn ASC
        """)
    List<MovimientoInventario> findByInsumoIdEnPeriodo(
            @Param("insumoId") Long insumoId,
            @Param("sucursalId") Long sucursalId,
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta);

    /** Último movimiento de un insumo en una sucursal antes de una fecha (saldo inicial del Kárdex) */
    List<MovimientoInventario> findTop1ByInsumoIdAndSucursalIdAndCreadoEnBeforeOrderByCreadoEnDesc(
            Long insumoId, Long sucursalId, LocalDateTime corte);
}
