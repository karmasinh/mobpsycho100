package com.restaurante.dto.response;

public record TopProductoDto(
        Long platoId,
        String platoNombre,
        Long cantidadVendida,
        Double totalIngresos
) {}
