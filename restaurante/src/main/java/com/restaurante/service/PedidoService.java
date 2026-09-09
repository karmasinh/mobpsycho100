package com.restaurante.service;

import com.restaurante.dto.request.PedidoRequest;
import com.restaurante.entity.Pedido;
import com.restaurante.enums.EstadoPedido;

import java.util.List;

public interface PedidoService {
    Pedido crear(PedidoRequest request, Long usuarioId);
    Pedido cambiarEstado(Long pedidoId, EstadoPedido nuevoEstado, Long usuarioId);
    Pedido obtenerPorId(Long id);
    List<Pedido> listarPorEstado(EstadoPedido estado);
    List<Pedido> listarPorEstado(EstadoPedido estado, Long sucursalId);
    List<Pedido> listarPorCliente(Long clienteId);
    List<Pedido> listarActivos(Long sucursalId);
    void cancelar(Long pedidoId, Long usuarioId);
}
