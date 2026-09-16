package com.restaurante.dto.response;

/**
 * Sugerencia (no automática) de registrar merma sobre el remanente de un lote,
 * cuando ese remanente cae bajo el umbral configurable
 * ({@code app.inventario.umbral-merma-porcentaje}, default 5%) tras un consumo
 * FEFO. Ver DEC-L-005. El usuario decide si registra la merma; nunca se
 * descuenta automáticamente.
 */
public record SugerenciaMermaDto(
        Long loteId,
        String numeroLote,
        Long insumoId,
        String insumoNombre,
        Boolean sugerirMerma,
        Double cantidadRestante,
        Double porcentajeRestante,
        String unidad
) {}
