package com.restaurante.scheduler;

import com.restaurante.entity.*;
import com.restaurante.enums.EstadoCliente;
import com.restaurante.enums.EstadoPensionado;
import com.restaurante.enums.TipoAlerta;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.repository.*;
import com.restaurante.service.PensionadoService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SistemaSchedulers {

    private static final Logger log = LoggerFactory.getLogger(SistemaSchedulers.class);

    private final ClienteRepository clienteRepository;
    private final LoteInsumoRepository loteInsumoRepository;
    private final StockInsumoRepository stockInsumoRepository;
    private final AlertaSistemaRepository alertaSistemaRepository;
    private final PensionadoRepository pensionadoRepository;
    private final PensionadoService pensionadoService;

    // ─── 1. Evaluación diaria de estados de clientes ───────────────
    /**
     * Todos los días a las 00:30 AM.
     * Reglas:
     *   - Sin compra en 30 días:  ACTIVO → POSIBLE_INACTIVO
     *   - Sin compra en 60 días:  POSIBLE_INACTIVO → INACTIVO
     *   - Sin compra en 90 días:  INACTIVO permanece (candidato a limpieza)
     */
    @Scheduled(cron = "0 30 0 * * *")
    @Transactional
    public void evaluarEstadosClientes() {
        log.info("[Scheduler] Evaluando estados de clientes...");

        LocalDate hoy = LocalDate.now();

        // ACTIVO → POSIBLE_INACTIVO si sin compra 30 días
        List<Cliente> posiblesInactivos = clienteRepository
                .findByEstado(EstadoCliente.ACTIVO).stream()
                .filter(c -> c.getUltimaCompra() != null
                        && c.getUltimaCompra().isBefore(hoy.minusDays(30)))
                .toList();
        posiblesInactivos.forEach(c -> c.setEstado(EstadoCliente.POSIBLE_INACTIVO));
        clienteRepository.saveAll(posiblesInactivos);

        // POSIBLE_INACTIVO → INACTIVO si sin compra 60 días
        List<Cliente> inactivos = clienteRepository
                .findByEstado(EstadoCliente.POSIBLE_INACTIVO).stream()
                .filter(c -> c.getUltimaCompra() != null
                        && c.getUltimaCompra().isBefore(hoy.minusDays(60)))
                .toList();
        inactivos.forEach(c -> c.setEstado(EstadoCliente.INACTIVO));
        clienteRepository.saveAll(inactivos);

        log.info("[Scheduler] Clientes actualizados — Posibles inactivos: {}, Inactivos: {}",
                posiblesInactivos.size(), inactivos.size());
    }

    // ─── 2. Baja automática de pensionados ─────────────────────────
    /**
     * Primer día de cada mes a la 01:00 AM.
     * Pensionados activos sin asistencia en los últimos 3 meses → BAJA_AUTOMATICA.
     */
    @Scheduled(cron = "0 0 1 1 * *")
    public void procesarBajasPensionados() {
        log.info("[Scheduler] Procesando bajas automáticas de pensionados...");
        pensionadoService.procesarBajasAutomaticas();
    }

    // ─── 3. Generación automática de cobros mensuales ──────────────
    /**
     * Primer día de cada mes a la 02:00 AM (después de las bajas automáticas).
     * Genera el CobroMensual del mes en curso para cada pensionado ACTIVO/REACTIVADO
     * que todavía no lo tenga (generarCobroMensual ya valida duplicados).
     */
    @Scheduled(cron = "0 0 2 1 * *")
    public void generarCobrosMensuales() {
        log.info("[Scheduler] Generando cobros mensuales de pensionados...");

        LocalDate hoy = LocalDate.now();
        List<Pensionado> pensionados = pensionadoRepository.findByEstadoIn(
                List.of(EstadoPensionado.ACTIVO, EstadoPensionado.REACTIVADO));

        int generados = 0;
        for (Pensionado p : pensionados) {
            try {
                pensionadoService.generarCobroMensual(p.getId(), hoy.getMonthValue(), hoy.getYear());
                generados++;
            } catch (DuplicadoException e) {
                // Ya se había generado el cobro de este mes para este pensionado — se ignora.
            } catch (Exception e) {
                log.error("[Scheduler] Error generando cobro mensual para pensionado {}: {}",
                        p.getId(), e.getMessage());
            }
        }

        log.info("[Scheduler] Cobros mensuales generados: {} de {} pensionados activos.",
                generados, pensionados.size());
    }

    // ─── 4. Alertas de vencimiento de inventario ──────────────────
    /**
     * Todos los días a las 06:00 AM.
     * Genera alertas para lotes a 15, 7 y 3 días de vencer.
     */
    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void alertasVencimientoInventario() {
        log.info("[Scheduler] Verificando vencimientos de inventario...");

        LocalDate hoy = LocalDate.now();

        // Lotes que vencen en los próximos 15 días (todas las sucursales)
        List<LoteInsumo> lotes15 = loteInsumoRepository.findLotesProximosVencer(hoy.plusDays(15), null);

        for (LoteInsumo lote : lotes15) {
            if (lote.getFechaVencimiento() == null) continue;

            long diasRestantes = hoy.until(lote.getFechaVencimiento()).getDays();

            TipoAlerta tipo;
            if (diasRestantes <= 3) {
                tipo = TipoAlerta.VENCIMIENTO_3_DIAS;
            } else if (diasRestantes <= 7) {
                tipo = TipoAlerta.VENCIMIENTO_7_DIAS;
            } else {
                tipo = TipoAlerta.VENCIMIENTO_15_DIAS;
            }

            // Evitar duplicar alertas no leídas del mismo lote
            boolean yaExiste = alertaSistemaRepository
                    .findByTipoAndLeidaFalse(tipo).stream()
                    .anyMatch(a -> lote.getId().equals(a.getEntidadReferenciaId()));

            if (!yaExiste) {
                alertaSistemaRepository.save(AlertaSistema.builder()
                        .tipo(tipo)
                        .mensaje(String.format(
                                "Lote %s del insumo '%s' vence en %d día(s) (%.2f %s disponibles)",
                                lote.getNumeroLote(),
                                lote.getInsumo().getNombre(),
                                diasRestantes,
                                lote.getCantidadDisponible(),
                                lote.getInsumo().getUnidadMedida()))
                        .entidadReferenciaId(lote.getId())
                        .entidadReferenciaNombre(lote.getInsumo().getNombre())
                        .sucursal(lote.getSucursal())
                        .leida(false)
                        .build());
            }
        }

        // Alertas por stock mínimo (una fila por insumo+sucursal con stock bajo)
        List<StockInsumo> stockBajo = stockInsumoRepository.findStockBajoGlobal();

        for (StockInsumo stock : stockBajo) {
            Insumo insumo = stock.getInsumo();
            boolean yaExiste = alertaSistemaRepository
                    .findByTipoAndLeidaFalse(TipoAlerta.STOCK_MINIMO).stream()
                    .anyMatch(a -> insumo.getId().equals(a.getEntidadReferenciaId())
                            && a.getSucursal() != null
                            && stock.getSucursal().getId().equals(a.getSucursal().getId()));

            if (!yaExiste) {
                alertaSistemaRepository.save(AlertaSistema.builder()
                        .tipo(TipoAlerta.STOCK_MINIMO)
                        .mensaje(String.format(
                                "Stock mínimo alcanzado en %s: '%s' — actual: %.2f %s, mínimo: %.2f %s",
                                stock.getSucursal().getNombre(), insumo.getNombre(),
                                stock.getStockActual(), insumo.getUnidadMedida(),
                                stock.getStockMinimo(), insumo.getUnidadMedida()))
                        .entidadReferenciaId(insumo.getId())
                        .entidadReferenciaNombre(insumo.getNombre())
                        .sucursal(stock.getSucursal())
                        .leida(false)
                        .build());
            }
        }

        log.info("[Scheduler] Alertas de vencimiento generadas.");
    }
}
