package com.restaurante.dto.response;

public record RentabilidadPlatoDto(
        Long platoId,
        String platoNombre,
        Long cantidadVendida,
        Double totalIngresos,
        Double costoUnitarioEstimado,
        Double costoTotalEstimado,
        Double margenTotal,
        Double margenPct
) {}
