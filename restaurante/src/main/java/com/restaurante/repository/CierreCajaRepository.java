package com.restaurante.repository;

import com.restaurante.entity.CierreCaja;
import com.restaurante.enums.EstadoCierreCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CierreCajaRepository extends JpaRepository<CierreCaja, Long> {
    Optional<CierreCaja> findByCajero_IdAndEstado(Long cajeroId, EstadoCierreCaja estado);
    List<CierreCaja> findBySucursalIdOrderByFechaAperturaDesc(Long sucursalId);
}
