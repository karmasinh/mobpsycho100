package com.restaurante.service;

import com.restaurante.dto.request.CrearProduccionRequest;
import com.restaurante.entity.LineaProduccion;
import com.restaurante.entity.ProduccionDia;
import com.restaurante.enums.EstadoProduccion;
import com.restaurante.enums.TipoLineaProduccion;

import java.time.LocalDate;
import java.util.List;

public interface ProduccionService {

    ProduccionDia crear(CrearProduccionRequest request);

    ProduccionDia obtenerPorId(Long id);

    ProduccionDia obtenerHoy(Long sucursalId);

    List<ProduccionDia> listarPorSucursal(Long sucursalId);

    ProduccionDia cambiarEstado(Long id, EstadoProduccion nuevoEstado);

    /**
     * Actualiza la cantidad producida de una línea. Si aumenta respecto al valor
     * anterior, consume automáticamente los insumos de la receta activa del plato
     * (delta × cantidad por ingrediente) vía InventarioService (FEFO).
     */
    LineaProduccion actualizarProducida(Long lineaId, Integer cantidadProducida, Long usuarioId);

    /** Sopas o segundos disponibles hoy (cantidadProducida > cantidadVendida) */
    List<LineaProduccion> disponiblesHoy(Long sucursalId, TipoLineaProduccion tipo);

    /** Decrementa stock de una línea al realizarse una venta */
    void decrementarStock(LocalDate fecha, Long sucursalId, Long platoId, int cantidad);

    /** Revierte el decremento anterior al anular una venta (repone cantidadVendida) */
    void revertirVenta(LocalDate fecha, Long sucursalId, Long platoId, int cantidad);
}
