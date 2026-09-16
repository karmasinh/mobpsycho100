package com.restaurante.dto.response;

public record InventarioComparativoSucursalDto(
        Long sucursalId,
        String sucursalNombre,
        Double totalMermas,
        Double valorMermas,
        Double valorStockActual
) {}
