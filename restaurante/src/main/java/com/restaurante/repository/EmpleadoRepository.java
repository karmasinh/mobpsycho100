package com.restaurante.repository;

import com.restaurante.entity.Empleado;
import com.restaurante.enums.EstadoEmpleado;
import com.restaurante.enums.TurnoEmpleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
    Optional<Empleado> findByCi(String ci);
    boolean existsByCi(String ci);
    List<Empleado> findByEstado(EstadoEmpleado estado);
    List<Empleado> findByTurnoAndEstado(TurnoEmpleado turno, EstadoEmpleado estado);
    List<Empleado> findBySucursalIdAndEstado(Long sucursalId, EstadoEmpleado estado);
}
