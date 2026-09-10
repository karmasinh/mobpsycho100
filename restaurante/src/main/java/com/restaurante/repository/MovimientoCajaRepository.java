package com.restaurante.repository;

import com.restaurante.entity.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {
    List<MovimientoCaja> findByCierreCaja_IdOrderByCreadoEnAsc(Long cierreCajaId);
    boolean existsByRevierteId(Long revierteId);
}
