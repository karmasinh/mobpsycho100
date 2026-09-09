package com.restaurante.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Migra el inventario de una sola bodega global a stock por sucursal:
 * - Completa lotes_insumo.sucursal_id / movimientos_inventario.sucursal_id
 *   para filas creadas antes de que existiera el campo (quedan en null).
 * - Crea stock_insumo a partir de insumos.stock_actual/stock_minimo (columnas
 *   que ya no mapea la entidad Insumo, pero que siguen existiendo en la tabla
 *   si la base ya tenía datos — se leen con SQL nativo).
 * Toda la migración asigna la primera sucursal activa encontrada. Idempotente:
 * solo toca filas con sucursal_id nulo / insumos sin stock_insumo todavía.
 */
@Component
@RequiredArgsConstructor
public class InventarioSucursalBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InventarioSucursalBackfillRunner.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        List<Long> sucursales = jdbcTemplate.queryForList(
                "SELECT id FROM sucursales WHERE activo = true ORDER BY id LIMIT 1", Long.class);
        if (sucursales.isEmpty()) return;
        Long sucursalId = sucursales.get(0);

        int lotes = jdbcTemplate.update(
                "UPDATE lotes_insumo SET sucursal_id = ? WHERE sucursal_id IS NULL", sucursalId);
        if (lotes > 0) log.info("[Backfill] sucursal_id completado en {} lote(s) de insumo existente(s).", lotes);

        int movimientos = jdbcTemplate.update(
                "UPDATE movimientos_inventario SET sucursal_id = ? WHERE sucursal_id IS NULL", sucursalId);
        if (movimientos > 0) log.info("[Backfill] sucursal_id completado en {} movimiento(s) de inventario existente(s).", movimientos);

        if (!existeColumnaStockLegacy()) return;

        int stockCreado = jdbcTemplate.update("""
                INSERT INTO stock_insumo (insumo_id, sucursal_id, stock_actual, stock_minimo, actualizado_en)
                SELECT i.id, ?, COALESCE(i.stock_actual, 0), COALESCE(i.stock_minimo, 0), now()
                FROM insumos i
                WHERE NOT EXISTS (
                    SELECT 1 FROM stock_insumo s WHERE s.insumo_id = i.id AND s.sucursal_id = ?
                )
                """, sucursalId, sucursalId);
        if (stockCreado > 0) log.info("[Backfill] stock_insumo creado para {} insumo(s) existente(s) en la sucursal #{}.",
                stockCreado, sucursalId);
    }

    private boolean existeColumnaStockLegacy() {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = 'insumos' AND column_name = 'stock_actual'
                """, Integer.class);
        return count != null && count > 0;
    }
}
