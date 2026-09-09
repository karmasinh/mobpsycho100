package com.restaurante.service;

import com.restaurante.dto.response.StockInsumoDto;
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

    /** Lista mermas de un insumo específico en una sucursal */
    List<MovimientoInventario> listarMermasPorInsumo(Long insumoId, Long sucursalId);

    /**
     * Genera el Kárdex de un insumo en una sucursal para el período [desde, hasta].
     * Retorna saldo inicial, totales de entradas/salidas, saldo final,
     * valor total y el detalle línea a línea.
     */
    Map<String, Object> obtenerKardex(Long insumoId, Long sucursalId, LocalDate desde, LocalDate hasta);
}
