package com.restaurante.service.impl;

import com.restaurante.entity.AlertaSistema;
import com.restaurante.entity.MovimientoCaja;
import com.restaurante.entity.SolicitudAprobacion;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Usuario;
import com.restaurante.entity.Venta;
import com.restaurante.enums.EstadoSolicitud;
import com.restaurante.enums.TipoAlerta;
import com.restaurante.enums.TipoSolicitud;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.AlertaSistemaRepository;
import com.restaurante.repository.MovimientoCajaRepository;
import com.restaurante.repository.SolicitudAprobacionRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.repository.VentaRepository;
import com.restaurante.service.CierreCajaService;
import com.restaurante.service.SolicitudAprobacionService;
import com.restaurante.service.VentaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SolicitudAprobacionServiceImpl implements SolicitudAprobacionService {

    private final SolicitudAprobacionRepository solicitudRepository;
    private final VentaRepository ventaRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlertaSistemaRepository alertaSistemaRepository;
    private final VentaService ventaService;
    private final CierreCajaService cierreCajaService;

    @Override
    @Transactional
    public SolicitudAprobacion solicitar(TipoSolicitud tipo, Long entidadId, String motivo, Long usuarioId) {
        if (motivo == null || motivo.isBlank()) {
            throw new NegocioException("Debe indicar un motivo para la solicitud.");
        }

        Sucursal sucursal = resolverSucursal(tipo, entidadId);
        Usuario solicitante = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));

        SolicitudAprobacion solicitud = solicitudRepository.save(SolicitudAprobacion.builder()
                .tipo(tipo)
                .entidadId(entidadId)
                .sucursal(sucursal)
                .motivo(motivo)
                .solicitante(solicitante)
                .build());

        alertaSistemaRepository.save(AlertaSistema.builder()
                .tipo(TipoAlerta.SOLICITUD_APROBACION)
                .mensaje(String.format("%s solicitó %s #%d — motivo: %s",
                        solicitante.getUsername(), etiqueta(tipo), entidadId, motivo))
                .entidadReferenciaId(solicitud.getId())
                .entidadReferenciaNombre("SolicitudAprobacion")
                .sucursal(sucursal)
                .build());

        return solicitud;
    }

    @Override
    @Transactional
    public SolicitudAprobacion aprobar(Long solicitudId, Long adminId) {
        SolicitudAprobacion solicitud = obtenerPendiente(solicitudId);

        switch (solicitud.getTipo()) {
            case ANULACION_VENTA -> ventaService.anular(solicitud.getEntidadId(), solicitud.getMotivo(), adminId);
            case REVERSION_MOVIMIENTO_CAJA -> cierreCajaService.revertirMovimiento(
                    solicitud.getEntidadId(), solicitud.getMotivo(), adminId);
        }

        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", adminId));
        solicitud.setEstado(EstadoSolicitud.APROBADA);
        solicitud.setResueltoPor(admin);
        solicitud.setResueltoEn(LocalDateTime.now());
        return solicitudRepository.save(solicitud);
    }

    @Override
    @Transactional
    public SolicitudAprobacion rechazar(Long solicitudId, String motivoRechazo, Long adminId) {
        if (motivoRechazo == null || motivoRechazo.isBlank()) {
            throw new NegocioException("Debe indicar un motivo para rechazar la solicitud.");
        }

        SolicitudAprobacion solicitud = obtenerPendiente(solicitudId);
        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", adminId));

        solicitud.setEstado(EstadoSolicitud.RECHAZADA);
        solicitud.setMotivoRechazo(motivoRechazo);
        solicitud.setResueltoPor(admin);
        solicitud.setResueltoEn(LocalDateTime.now());
        return solicitudRepository.save(solicitud);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SolicitudAprobacion> listarPendientes(Long sucursalEfectiva) {
        List<SolicitudAprobacion> pendientes = solicitudRepository.findByEstadoOrderByCreadoEnDesc(EstadoSolicitud.PENDIENTE);
        if (sucursalEfectiva == null) return pendientes;
        return pendientes.stream()
                .filter(s -> s.getSucursal() == null || sucursalEfectiva.equals(s.getSucursal().getId()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SolicitudAprobacion> listarMias(Long usuarioId) {
        return solicitudRepository.findBySolicitante_IdOrderByCreadoEnDesc(usuarioId);
    }

    private SolicitudAprobacion obtenerPendiente(Long solicitudId) {
        SolicitudAprobacion solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RecursoNoEncontradoException("SolicitudAprobacion", solicitudId));
        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new NegocioException("La solicitud #" + solicitudId + " ya fue resuelta.");
        }
        return solicitud;
    }

    private Sucursal resolverSucursal(TipoSolicitud tipo, Long entidadId) {
        return switch (tipo) {
            case ANULACION_VENTA -> {
                Venta venta = ventaRepository.findById(entidadId)
                        .orElseThrow(() -> new RecursoNoEncontradoException("Venta", entidadId));
                yield venta.getSucursal();
            }
            case REVERSION_MOVIMIENTO_CAJA -> {
                MovimientoCaja movimiento = movimientoCajaRepository.findById(entidadId)
                        .orElseThrow(() -> new RecursoNoEncontradoException("MovimientoCaja", entidadId));
                yield movimiento.getCierreCaja().getSucursal();
            }
        };
    }

    private String etiqueta(TipoSolicitud tipo) {
        return switch (tipo) {
            case ANULACION_VENTA -> "anular la venta";
            case REVERSION_MOVIMIENTO_CAJA -> "revertir el movimiento de caja";
        };
    }
}
