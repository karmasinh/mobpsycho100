package com.restaurante.repository;

import com.restaurante.entity.Pedido;
import com.restaurante.enums.EstadoPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    List<Pedido> findByEstado(EstadoPedido estado);
    List<Pedido> findByClienteIdOrderByCreadoEnDesc(Long clienteId);
    List<Pedido> findByPensionadoIdOrderByCreadoEnDesc(Long pensionadoId);
    List<Pedido> findBySucursalIdAndEstado(Long sucursalId, EstadoPedido estado);

    @Query("SELECT COUNT(dp) > 0 FROM DetallePedido dp WHERE dp.plato.id = :platoId AND dp.pedido.estado != :estado")
    boolean existsByPlatoEnDetallesAndEstadoNot(Long platoId, EstadoPedido estado);
}
