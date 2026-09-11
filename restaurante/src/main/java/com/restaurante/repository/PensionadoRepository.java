package com.restaurante.repository;

import com.restaurante.entity.Pensionado;
import com.restaurante.enums.EstadoPensionado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PensionadoRepository extends JpaRepository<Pensionado, Long> {
    Optional<Pensionado> findByCedula(String cedula);
    boolean existsByCedula(String cedula);
    boolean existsByTelefono(String telefono);
    boolean existsByCorreo(String correo);
    List<Pensionado> findByEstado(EstadoPensionado estado);
    List<Pensionado> findByEstadoIn(List<EstadoPensionado> estados);

    /**
     * Busca pensionados activos sin asistencia registrada en los últimos 3 meses
     * para la baja automática.
     */
    @Query("""
        SELECT p FROM Pensionado p
        WHERE p.estado = 'ACTIVO'
          AND (
            SELECT COUNT(a) FROM AsistenciaPensionado a
            WHERE a.pensionado = p AND a.fecha >= :desde
          ) = 0
    """)
    List<Pensionado> findActivosSinAsistenciaDesde(LocalDate desde);
}
