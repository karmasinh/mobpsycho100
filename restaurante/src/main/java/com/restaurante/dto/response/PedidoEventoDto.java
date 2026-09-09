package com.restaurante.dto.response;

import com.restaurante.entity.Pedido;
import com.restaurante.enums.TipoEventoPedido;

public record PedidoEventoDto(
        TipoEventoPedido tipo,
        Pedido pedido
) {}
