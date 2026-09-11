package com.restaurante.repository;

import com.restaurante.entity.Factura;
import com.restaurante.enums.EstadoFactura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FacturaRepository extends JpaRepository<Factura, Long> {

    Optional<Factura> findByVentaId(Long ventaId);

    List<Factura> findBySucursalIdOrderByFechaEmisionDesc(Long sucursalId);

    List<Factura> findBySucursalIdAndEstadoOrderByFechaEmisionDesc(Long sucursalId, EstadoFactura estado);

    @Query("""
        SELECT f FROM Factura f
        WHERE f.sucursal.id = :sucursalId
          AND f.fechaEmision BETWEEN :desde AND :hasta
        ORDER BY f.fechaEmision DESC
    """)
    List<Factura> findPorRango(Long sucursalId, LocalDateTime desde, LocalDateTime hasta);
}
