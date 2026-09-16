package com.restaurante.repository;

import com.restaurante.entity.CicloPensionado;
import com.restaurante.enums.EstadoCiclo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CicloPensionadoRepository extends JpaRepository<CicloPensionado, Long> {

    Optional<CicloPensionado> findByPensionado_IdAndEstado(Long pensionadoId, EstadoCiclo estado);

    List<CicloPensionado> findByPensionado_IdOrderByFechaInicioDesc(Long pensionadoId);
}
