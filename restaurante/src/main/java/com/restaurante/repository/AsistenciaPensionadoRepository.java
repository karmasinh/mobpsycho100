package com.restaurante.repository;

import com.restaurante.entity.AsistenciaPensionado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AsistenciaPensionadoRepository extends JpaRepository<AsistenciaPensionado, Long> {

    Optional<AsistenciaPensionado> findByPensionado_IdAndFecha(Long pensionadoId, LocalDate fecha);

    boolean existsByPensionado_IdAndFecha(Long pensionadoId, LocalDate fecha);

    @Query("""
        SELECT COUNT(a) FROM AsistenciaPensionado a
        WHERE a.pensionado.id = :pensionadoId
          AND a.asistio = true
          AND EXTRACT(MONTH FROM a.fecha) = :mes AND EXTRACT(YEAR FROM a.fecha) = :anio
    """)
    int countAsistenciasByMesAnio(Long pensionadoId, int mes, int anio);

    List<AsistenciaPensionado> findByPensionado_IdOrderByFechaDesc(Long pensionadoId);
}
