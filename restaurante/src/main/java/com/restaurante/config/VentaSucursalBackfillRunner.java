package com.restaurante.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Rellena ventas.sucursal_id para filas creadas antes de que Venta tuviera
 * el campo sucursal propio, tomando la sucursal del pedido asociado.
 * Idempotente: solo toca filas con sucursal_id nulo.
 */
@Component
@RequiredArgsConstructor
public class VentaSucursalBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(VentaSucursalBackfillRunner.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        int actualizadas = jdbcTemplate.update("""
                UPDATE ventas
                SET sucursal_id = (SELECT p.sucursal_id FROM pedidos p WHERE p.id = ventas.pedido_id)
                WHERE sucursal_id IS NULL
                """);
        if (actualizadas > 0) {
            log.info("[Backfill] sucursal_id completado en {} venta(s) existente(s).", actualizadas);
        }
    }
}
