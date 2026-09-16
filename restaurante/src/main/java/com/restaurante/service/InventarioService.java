package com.restaurante.service;

import com.restaurante.dto.response.InventarioComparativoSucursalDto;
import com.restaurante.dto.response.StockInsumoDto;
import com.restaurante.dto.response.SugerenciaMermaDto;
import com.restaurante.entity.LoteInsumo;
import com.restaurante.entity.MovimientoInventario;
import com.restaurante.enums.TipoMovimientoInventario;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface InventarioService {
    /** Ingresa un lote al inventario de una sucursal y registra movimiento INGRESO_COMPRA */
    LoteInsumo ingresarLote(Long insumoId, Long sucursalId, Long proveedorId, String numeroLote,
                             Double cantidad, Double precioUnitario,
                             LocalDate fechaVencimiento, Long usuarioId);

    /**
     * Descuenta stock de una sucursal usando FEFO. Lanza StockInsuficienteException si no hay suficiente stock.
     */
    void consumirStock(Long insumoId, Long sucursalId, Double cantidad, String motivo,
                       TipoMovimientoInventario tipo, Long usuarioId);

    /** Stock "vivo" de una sucursal (catálogo + cantidad disponible ahí) */
    List<StockInsumoDto> listarStockPorSucursal(Long sucursalId);

    List<StockInsumoDto> listarConStockBajo(Long sucursalId);

    List<LoteInsumo> listarLotesProximosVencer(int dias, Long sucursalId);

    List<MovimientoInventario> historialMovimientos(Long insumoId, Long sucursalId);

    void ajustarStock(Long insumoId, Long sucursalId, Double nuevaCantidad, String motivo, Long usuarioId);

    void ajustarStockMinimo(Long insumoId, Long sucursalId, Double nuevoMinimo, Long usuarioId);

    /** Registra una merma: descuenta stock FEFO y persiste causa + observaciones + valor económico */
    MovimientoInventario registrarMerma(Long insumoId, Long sucursalId, Double cantidad,
                                        String causa, String observaciones, Long usuarioId);

    /** Lista las mermas de una sucursal */
    List<MovimientoInventario> listarMermas(Long sucursalId);

    /**
     * Registra una devolución a proveedor sobre un lote puntual: descuenta el
     * remanente del lote y el stock de la sucursal, y persiste un
     * MovimientoInventario tipo DEVOLUCION_PROVEEDOR (numeroDevolucion va en `observaciones`).
     */
    MovimientoInventario registrarDevolucion(Long insumoId, Long sucursalId, Long loteId, Double cantidad,
                                             String motivo, String numeroDevolucion, Long usuarioId);

    /** Lista mermas de un insumo específico en una sucursal */
    List<MovimientoInventario> listarMermasPorInsumo(Long insumoId, Long sucursalId);

    /**
     * Genera el Kárdex de un insumo en una sucursal para el período [desde, hasta].
     * Retorna saldo inicial, totales de entradas/salidas, saldo final,
     * valor total y el detalle línea a línea.
     */
    Map<String, Object> obtenerKardex(Long insumoId, Long sucursalId, LocalDate desde, LocalDate hasta);

    /**
     * Sugerencia de merma para un lote puntual (DEC-L-005): indica si su
     * remanente cayó bajo el umbral configurado. Es solo informativo — no
     * descuenta ni registra nada.
     */
    SugerenciaMermaDto sugerenciaMermaLote(Long loteId);

    /**
     * Lotes activos de un insumo en una sucursal cuyo remanente está bajo el
     * umbral de merma sugerida. Útil para consultar justo después de un
     * consumo/ajuste sin conocer de antemano qué lote(s) tocó el FEFO.
     */
    List<SugerenciaMermaDto> lotesEnRiesgoPorInsumo(Long insumoId, Long sucursalId);

    /** Comparativo entre sucursales (ADMIN): mermas del período y valor de stock actual, por sucursal */
    List<InventarioComparativoSucursalDto> comparativoSucursales(LocalDate desde, LocalDate hasta);

    /**
     * Elimina lógicamente un lote (p. ej. cargado por error): lo marca
     * {@code eliminado = true} (queda fuera de FEFO/vencimientos/riesgo de
     * merma, pero conserva su historial de movimientos), descuenta su
     * remanente del stock de la sucursal si tenía cantidad disponible, y
     * registra el ajuste como movimiento + auditoría.
     */
    MovimientoInventario eliminarLote(Long loteId, String motivo, Long usuarioId);
}
