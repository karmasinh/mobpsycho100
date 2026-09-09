package com.restaurante.repository;

import com.restaurante.dto.response.VentaPorSucursalDto;
import com.restaurante.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {
    Optional<Venta> findByPedidoId(Long pedidoId);

    List<Venta> findByCajero_IdAndSucursalIdAndCreadoEnBetweenAndAnuladaFalse(
            Long cajeroId, Long sucursalId, LocalDateTime desde, LocalDateTime hasta);

    @Query("""
        SELECT v FROM Venta v
        WHERE v.creadoEn BETWEEN :desde AND :hasta
          AND v.anulada = false
          AND (:sucursalId IS NULL OR v.sucursal.id = :sucursalId)
    """)
    List<Venta> findVentasEntreFechas(LocalDateTime desde, LocalDateTime hasta, Long sucursalId);

    @Query("""
        SELECT COALESCE(SUM(v.totalCobrado),0) FROM Venta v
        WHERE v.creadoEn BETWEEN :desde AND :hasta
          AND v.anulada = false
          AND (:sucursalId IS NULL OR v.sucursal.id = :sucursalId)
    """)
    Double sumTotalEntreFechas(LocalDateTime desde, LocalDateTime hasta, Long sucursalId);

    @Query("""
        SELECT new com.restaurante.dto.response.VentaPorSucursalDto(
            v.sucursal.id, v.sucursal.nombre, SUM(v.totalCobrado), COUNT(v)
        )
        FROM Venta v
        WHERE v.creadoEn BETWEEN :desde AND :hasta
          AND v.anulada = false
          AND v.sucursal IS NOT NULL
        GROUP BY v.sucursal.id, v.sucursal.nombre
        ORDER BY SUM(v.totalCobrado) DESC
    """)
    List<VentaPorSucursalDto> findTotalPorSucursal(LocalDateTime desde, LocalDateTime hasta);
}
