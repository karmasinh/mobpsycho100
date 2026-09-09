package com.restaurante.dto.response;

public record VentaPorSucursalDto(
        Long sucursalId,
        String sucursalNombre,
        Double total,
        Long cantidad
) {}
