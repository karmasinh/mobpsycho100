package com.restaurante.service.impl;

import com.restaurante.dto.request.AvanzarEstadoSolicitudCompraRequest;
import com.restaurante.dto.request.CrearSolicitudCompraRequest;
import com.restaurante.entity.AlertaSistema;
import com.restaurante.entity.Insumo;
import com.restaurante.entity.Proveedor;
import com.restaurante.entity.SolicitudCompra;
import com.restaurante.entity.SolicitudCompraItem;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Usuario;
import com.restaurante.enums.EstadoSolicitudCompra;
import com.restaurante.enums.TipoAlerta;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.AlertaSistemaRepository;
import com.restaurante.repository.InsumoRepository;
import com.restaurante.repository.ProveedorRepository;
import com.restaurante.repository.SolicitudCompraRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.service.InventarioService;
import com.restaurante.service.SolicitudCompraService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SolicitudCompraServiceImpl implements SolicitudCompraService {

    private final SolicitudCompraRepository solicitudCompraRepository;
    private final ProveedorRepository proveedorRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final InsumoRepository insumoRepository;
    private final AlertaSistemaRepository alertaSistemaRepository;
    private final InventarioService inventarioService;

    /**
     * Transiciones válidas del flujo de aprobación: cada estado no terminal
     * mapea al único siguiente estado operativo permitido. RECHAZADA se
     * valida aparte porque puede alcanzarse desde dos estados distintos.
     */
    private static final Map<EstadoSolicitudCompra, EstadoSolicitudCompra> SIGUIENTE_ESTADO = Map.of(
            EstadoSolicitudCompra.CREADA, EstadoSolicitudCompra.EN_REVISION,
            EstadoSolicitudCompra.EN_REVISION, EstadoSolicitudCompra.APROBADA,
            EstadoSolicitudCompra.APROBADA, EstadoSolicitudCompra.EN_PROCESO,
            EstadoSolicitudCompra.EN_PROCESO, EstadoSolicitudCompra.RECIBIDA
    );

    private static final List<EstadoSolicitudCompra> ORIGENES_RECHAZO = List.of(
            EstadoSolicitudCompra.CREADA, EstadoSolicitudCompra.EN_REVISION
    );

    @Override
    @Transactional
    public SolicitudCompra crear(CrearSolicitudCompraRequest request, Long sucursalId, Long usuarioId) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new NegocioException("La solicitud de compra debe incluir al menos un ítem.");
        }

        Proveedor proveedor = proveedorRepository.findById(request.getProveedorId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor", request.getProveedorId()));
        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", sucursalId));
        Usuario solicitante = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));

        SolicitudCompra solicitud = SolicitudCompra.builder()
                .proveedor(proveedor)
                .sucursal(sucursal)
                .solicitante(solicitante)
                .estado(EstadoSolicitudCompra.CREADA)
                .build();

        for (CrearSolicitudCompraRequest.ItemRequest itemRequest : request.getItems()) {
            Insumo insumo = insumoRepository.findById(itemRequest.getInsumoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", itemRequest.getInsumoId()));

            solicitud.getItems().add(SolicitudCompraItem.builder()
                    .solicitudCompra(solicitud)
                    .insumo(insumo)
                    .cantidadSolicitada(itemRequest.getCantidadSolicitada())
                    .observaciones(itemRequest.getObservaciones())
                    .build());
        }

        SolicitudCompra guardada = solicitudCompraRepository.save(solicitud);

        alertaSistemaRepository.save(AlertaSistema.builder()
                .tipo(TipoAlerta.SOLICITUD_COMPRA)
                .mensaje(String.format("%s solicitó una compra a %s con %d ítem(s)",
                        solicitante.getUsername(), proveedor.getNombre(), guardada.getItems().size()))
                .entidadReferenciaId(guardada.getId())
                .entidadReferenciaNombre("SolicitudCompra")
                .sucursal(sucursal)
                .build());

        return guardada;
    }

    @Override
    @Transactional
    public SolicitudCompra avanzarEstado(Long id, EstadoSolicitudCompra nuevoEstado,
                                          AvanzarEstadoSolicitudCompraRequest request, Long usuarioId) {
        SolicitudCompra solicitud = obtenerPorId(id);
        EstadoSolicitudCompra actual = solicitud.getEstado();

        if (nuevoEstado == EstadoSolicitudCompra.RECHAZADA) {
            if (!ORIGENES_RECHAZO.contains(actual)) {
                throw new NegocioException(
                        "Transición inválida: no se puede rechazar una solicitud en estado " + actual + ".");
            }
            String motivoRechazo = request != null ? request.getMotivoRechazo() : null;
            if (motivoRechazo == null || motivoRechazo.isBlank()) {
                throw new NegocioException("Debe indicar un motivo para rechazar la solicitud.");
            }
            solicitud.setEstado(EstadoSolicitudCompra.RECHAZADA);
            solicitud.setMotivoRechazo(motivoRechazo);
            return solicitudCompraRepository.save(solicitud);
        }

        if (!nuevoEstado.equals(SIGUIENTE_ESTADO.get(actual))) {
            throw new NegocioException(
                    "Transición inválida: no se puede pasar de " + actual + " a " + nuevoEstado + ".");
        }

        if (nuevoEstado == EstadoSolicitudCompra.RECIBIDA) {
            recibirItems(solicitud, request, usuarioId);
            solicitud.setFechaRecepcion(
                    request != null && request.getFechaRecepcion() != null
                            ? request.getFechaRecepcion() : LocalDate.now());
        }

        solicitud.setEstado(nuevoEstado);
        return solicitudCompraRepository.save(solicitud);
    }

    /** Al marcar RECIBIDA, ingresa un lote por cada ítem reutilizando InventarioService.ingresarLote. */
    private void recibirItems(SolicitudCompra solicitud, AvanzarEstadoSolicitudCompraRequest request, Long usuarioId) {
        Map<Long, AvanzarEstadoSolicitudCompraRequest.ItemRecepcionRequest> datosPorItem = request != null && request.getItems() != null
                ? request.getItems().stream().collect(java.util.stream.Collectors.toMap(
                        AvanzarEstadoSolicitudCompraRequest.ItemRecepcionRequest::getItemId, i -> i))
                : Map.of();

        for (SolicitudCompraItem item : solicitud.getItems()) {
            AvanzarEstadoSolicitudCompraRequest.ItemRecepcionRequest datos = datosPorItem.get(item.getId());

            String numeroLote = datos != null && datos.getNumeroLote() != null
                    ? datos.getNumeroLote() : "SC-" + solicitud.getId() + "-" + item.getId();
            Double precioUnitario = datos != null && datos.getPrecioUnitario() != null
                    ? datos.getPrecioUnitario() : item.getInsumo().getPrecioUnitario();
            LocalDate fechaVencimiento = datos != null ? datos.getFechaVencimiento() : null;

            inventarioService.ingresarLote(
                    item.getInsumo().getId(), solicitud.getSucursal().getId(), solicitud.getProveedor().getId(),
                    numeroLote, item.getCantidadSolicitada(), precioUnitario, fechaVencimiento, usuarioId);
        }
    }

    private static final List<EstadoSolicitudCompra> ESTADOS_PENDIENTES = List.of(
            EstadoSolicitudCompra.CREADA, EstadoSolicitudCompra.EN_REVISION,
            EstadoSolicitudCompra.APROBADA, EstadoSolicitudCompra.EN_PROCESO
    );

    @Override
    @Transactional(readOnly = true)
    public List<SolicitudCompra> listarPendientes(Long sucursalEfectiva) {
        List<SolicitudCompra> pendientes = ESTADOS_PENDIENTES.stream()
                .flatMap(estado -> solicitudCompraRepository.findByEstado(estado).stream())
                .toList();
        if (sucursalEfectiva == null) return pendientes;
        return pendientes.stream()
                .filter(s -> s.getSucursal() == null || sucursalEfectiva.equals(s.getSucursal().getId()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SolicitudCompra> listarMias(Long usuarioId) {
        return solicitudCompraRepository.findBySolicitante_Id(usuarioId);
    }

    @Override
    @Transactional(readOnly = true)
    public SolicitudCompra obtenerPorId(Long id) {
        return solicitudCompraRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("SolicitudCompra", id));
    }
}
