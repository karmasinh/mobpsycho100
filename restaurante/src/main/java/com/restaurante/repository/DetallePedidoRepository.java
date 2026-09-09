package com.restaurante.repository;

import com.restaurante.dto.response.TopProductoDto;
import com.restaurante.entity.DetallePedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DetallePedidoRepository extends JpaRepository<DetallePedido, Long> {

    @Query("""
        SELECT new com.restaurante.dto.response.TopProductoDto(
            dp.plato.id,
            dp.plato.nombre,
            SUM(dp.cantidad),
            SUM(dp.cantidad * dp.precioUnitario)
        )
        FROM DetallePedido dp
        WHERE dp.pedido.creadoEn BETWEEN :desde AND :hasta
          AND dp.pedido.estado NOT IN (
              com.restaurante.enums.EstadoPedido.CANCELADO
          )
          AND (:sucursalId IS NULL OR dp.pedido.sucursal.id = :sucursalId)
        GROUP BY dp.plato.id, dp.plato.nombre
        ORDER BY SUM(dp.cantidad) DESC
    """)
    List<TopProductoDto> findTopProductos(
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta,
            @Param("sucursalId") Long sucursalId);
}
