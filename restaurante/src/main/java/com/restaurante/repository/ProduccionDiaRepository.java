package com.restaurante.repository;

import com.restaurante.entity.ProduccionDia;
import com.restaurante.enums.EstadoProduccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProduccionDiaRepository extends JpaRepository<ProduccionDia, Long> {

    Optional<ProduccionDia> findByFechaAndSucursalId(LocalDate fecha, Long sucursalId);

    List<ProduccionDia> findBySucursalIdOrderByFechaDesc(Long sucursalId);

    List<ProduccionDia> findBySucursalIdAndEstadoOrderByFechaDesc(Long sucursalId, EstadoProduccion estado);
}
