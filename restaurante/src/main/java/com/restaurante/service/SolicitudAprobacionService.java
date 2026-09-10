package com.restaurante.service;

import com.restaurante.entity.SolicitudAprobacion;
import com.restaurante.enums.TipoSolicitud;

import java.util.List;

public interface SolicitudAprobacionService {
    SolicitudAprobacion solicitar(TipoSolicitud tipo, Long entidadId, String motivo, Long usuarioId);
    SolicitudAprobacion aprobar(Long solicitudId, Long adminId);
    SolicitudAprobacion rechazar(Long solicitudId, String motivoRechazo, Long adminId);
    List<SolicitudAprobacion> listarPendientes(Long sucursalEfectiva);
    List<SolicitudAprobacion> listarMias(Long usuarioId);
}
