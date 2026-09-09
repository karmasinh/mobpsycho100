package com.restaurante.repository;

import com.restaurante.entity.AuditoriaLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditoriaLogRepository extends JpaRepository<AuditoriaLog, Long> {
    List<AuditoriaLog> findByEntidadAndEntidadIdOrderByCreadoEnDesc(String entidad, Long entidadId);
    List<AuditoriaLog> findByUsernameOrderByCreadoEnDesc(String username);
}
