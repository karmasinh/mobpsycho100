package com.restaurante.repository;

import com.restaurante.entity.SolicitudCompra;
import com.restaurante.enums.EstadoSolicitudCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudCompraRepository extends JpaRepository<SolicitudCompra, Long> {
    List<SolicitudCompra> findByEstado(EstadoSolicitudCompra estado);
    List<SolicitudCompra> findBySucursal_Id(Long sucursalId);
    List<SolicitudCompra> findBySolicitante_Id(Long solicitanteId);
}
