package com.restaurante.service.impl;

import com.restaurante.dto.request.CrearProduccionRequest;
import com.restaurante.entity.LineaProduccion;
import com.restaurante.entity.Plato;
import com.restaurante.entity.Receta;
import com.restaurante.entity.RecetaIngrediente;
import com.restaurante.entity.ProduccionDia;
import com.restaurante.entity.Sucursal;
import com.restaurante.enums.EstadoProduccion;
import com.restaurante.enums.TipoLineaProduccion;
import com.restaurante.enums.TipoMovimientoInventario;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.LineaProduccionRepository;
import com.restaurante.repository.PlatoRepository;
import com.restaurante.repository.ProduccionDiaRepository;
import com.restaurante.repository.RecetaRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.service.InventarioService;
import com.restaurante.service.ProduccionService;
import com.restaurante.service.UnidadConversionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProduccionServiceImpl implements ProduccionService {

    private static final Logger log = LoggerFactory.getLogger(ProduccionServiceImpl.class);

    private final ProduccionDiaRepository produccionRepo;
    private final LineaProduccionRepository lineaRepo;
    private final PlatoRepository platoRepository;
    private final SucursalRepository sucursalRepository;
    private final RecetaRepository recetaRepository;
    private final InventarioService inventarioService;
    private final UnidadConversionService unidadConversionService;

    @Override
    @Transactional
    public ProduccionDia crear(CrearProduccionRequest request) {
        Sucursal sucursal = sucursalRepository.findById(request.getSucursalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", request.getSucursalId()));

        if (produccionRepo.findByFechaAndSucursalId(request.getFecha(), request.getSucursalId()).isPresent()) {
            throw new NegocioException("Ya existe un plan de producción para la fecha " + request.getFecha());
        }

        ProduccionDia produccion = ProduccionDia.builder()
                .fecha(request.getFecha())
                .sucursal(sucursal)
                .estado(EstadoProduccion.PLANIFICADO)
                .build();

        for (CrearProduccionRequest.LineaRequest lr : request.getLineas()) {
            Plato plato = platoRepository.findById(lr.getPlatoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Plato", lr.getPlatoId()));

            LineaProduccion linea = LineaProduccion.builder()
                    .produccion(produccion)
                    .plato(plato)
                    .tipo(lr.getTipo())
                    .cantidadPlanificada(lr.getCantidadPlanificada())
                    .cantidadProducida(0)
                    .cantidadVendida(0)
                    .build();

            produccion.getLineas().add(linea);
        }

        return produccionRepo.save(produccion);
    }

    @Override
    @Transactional(readOnly = true)
    public ProduccionDia obtenerPorId(Long id) {
        return produccionRepo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("ProduccionDia", id));
    }

    @Override
    @Transactional(readOnly = true)
    public ProduccionDia obtenerHoy(Long sucursalId) {
        return produccionRepo.findByFechaAndSucursalId(LocalDate.now(), sucursalId)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProduccionDia> listarPorSucursal(Long sucursalId) {
        return produccionRepo.findBySucursalIdOrderByFechaDesc(sucursalId);
    }

    /**
     * Transiciones válidas del estado de producción del día: sólo hacia
     * adelante y sin saltos (PLANIFICADO → EN_CURSO → CERRADO). AUD-L-005.
     */
    private static final java.util.Map<EstadoProduccion, EstadoProduccion> SIGUIENTE_ESTADO = java.util.Map.of(
            EstadoProduccion.PLANIFICADO, EstadoProduccion.EN_CURSO,
            EstadoProduccion.EN_CURSO, EstadoProduccion.CERRADO
    );

    @Override
    @Transactional
    public ProduccionDia cambiarEstado(Long id, EstadoProduccion nuevoEstado) {
        ProduccionDia produccion = obtenerPorId(id);
        EstadoProduccion actual = produccion.getEstado();
        if (!nuevoEstado.equals(SIGUIENTE_ESTADO.get(actual))) {
            throw new NegocioException(
                    "Transición inválida: no se puede pasar de " + actual + " a " + nuevoEstado + ".");
        }
        produccion.setEstado(nuevoEstado);
        return produccionRepo.save(produccion);
    }

    @Override
    @Transactional
    public LineaProduccion actualizarProducida(Long lineaId, Integer cantidadProducida, Long usuarioId) {
        LineaProduccion linea = lineaRepo.findById(lineaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("LineaProduccion", lineaId));
        EstadoProduccion estadoDia = linea.getProduccion().getEstado();
        if (estadoDia != EstadoProduccion.EN_CURSO) {
            throw new NegocioException(
                    "No se puede registrar producción: el día está en estado " + estadoDia
                            + " (debe estar EN_CURSO).");
        }
        if (cantidadProducida < 0) throw new NegocioException("La cantidad producida no puede ser negativa");
        if (cantidadProducida > linea.getCantidadPlanificada()) {
            throw new NegocioException("La cantidad producida (" + cantidadProducida
                    + ") no puede superar la cantidad planificada (" + linea.getCantidadPlanificada() + ").");
        }

        int delta = cantidadProducida - linea.getCantidadProducida();
        if (delta > 0) {
            Long sucursalId = linea.getProduccion().getSucursal().getId();
            consumirInsumosPorReceta(linea.getPlato(), sucursalId, delta, usuarioId);
        }

        linea.setCantidadProducida(cantidadProducida);
        return lineaRepo.save(linea);
    }

    /** Descuenta insumos (FEFO) de la sucursal según la receta activa del plato, escalada por la cantidad producida. */
    private void consumirInsumosPorReceta(Plato plato, Long sucursalId, int cantidadProducida, Long usuarioId) {
        Receta receta = recetaRepository.findByPlatoIdAndActivaTrue(plato.getId()).orElse(null);
        if (receta == null) {
            throw new NegocioException("El plato '" + plato.getNombre()
                    + "' no tiene una receta activa: no se puede registrar producción sin poder descontar insumos.");
        }

        for (RecetaIngrediente ingrediente : receta.getIngredientes()) {
            String unidadInsumo = ingrediente.getInsumo().getUnidadMedida();
            double cantidadEnUnidadInsumo = unidadConversionService
                    .convertir(ingrediente.getCantidad(), ingrediente.getUnidadMedida(), unidadInsumo)
                    .orElseGet(() -> {
                        log.warn("No se pudo convertir '{}' de '{}' a '{}' para el insumo '{}': se usa la "
                                + "cantidad sin convertir (unidades no reconocidas o de distinta magnitud).",
                                ingrediente.getCantidad(), ingrediente.getUnidadMedida(), unidadInsumo,
                                ingrediente.getInsumo().getNombre());
                        return ingrediente.getCantidad();
                    });
            double cantidadAConsumir = cantidadEnUnidadInsumo * cantidadProducida;
            inventarioService.consumirStock(
                    ingrediente.getInsumo().getId(),
                    sucursalId,
                    cantidadAConsumir,
                    "Producción: " + plato.getNombre() + " x" + cantidadProducida,
                    TipoMovimientoInventario.CONSUMO_PRODUCCION,
                    usuarioId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<LineaProduccion> disponiblesHoy(Long sucursalId, TipoLineaProduccion tipo) {
        return lineaRepo.findDisponiblesPorTipo(LocalDate.now(), sucursalId, tipo);
    }

    @Override
    @Transactional
    public void decrementarStock(LocalDate fecha, Long sucursalId, Long platoId, int cantidad) {
        LineaProduccion linea = lineaRepo.findByFechaAndSucursalAndPlato(fecha, sucursalId, platoId)
                .orElseThrow(() -> new NegocioException(
                        "No hay producción planificada hoy para \"" + nombrePlato(platoId) + "\" — no se puede vender."));

        int filasActualizadas = lineaRepo.incrementarVendida(linea.getId(), cantidad);
        if (filasActualizadas == 0) {
            throw new NegocioException(
                    "Stock insuficiente de \"" + nombrePlato(platoId) + "\": disponible " + linea.getCantidadDisponible()
                    + ", se intentó vender " + cantidad + ".");
        }
    }

    private String nombrePlato(Long platoId) {
        return platoRepository.findById(platoId).map(Plato::getNombre).orElse("plato #" + platoId);
    }

    @Override
    @Transactional
    public void revertirVenta(LocalDate fecha, Long sucursalId, Long platoId, int cantidad) {
        lineaRepo.findByFechaAndSucursalAndPlato(fecha, sucursalId, platoId)
                .ifPresent(linea -> lineaRepo.decrementarVendida(linea.getId(), cantidad));
    }
}
