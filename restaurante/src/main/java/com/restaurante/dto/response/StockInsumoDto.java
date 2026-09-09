package com.restaurante.dto.response;

public record StockInsumoDto(
        Long insumoId,
        String codigo,
        String nombre,
        String unidadMedida,
        Double stockActual,
        Double stockMinimo,
        Double precioUnitario,
        Boolean perecedero,
        Long categoriaId,
        String categoriaNombre
) {}
