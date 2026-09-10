package com.restaurante.repository;

import com.restaurante.entity.SolicitudAprobacion;
import com.restaurante.enums.EstadoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudAprobacionRepository extends JpaRepository<SolicitudAprobacion, Long> {
    List<SolicitudAprobacion> findByEstadoOrderByCreadoEnDesc(EstadoSolicitud estado);
    List<SolicitudAprobacion> findBySolicitante_IdOrderByCreadoEnDesc(Long solicitanteId);
}
