package com.restaurante.repository;

import com.restaurante.entity.AlertaSistema;
import com.restaurante.enums.TipoAlerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertaSistemaRepository extends JpaRepository<AlertaSistema, Long> {
    List<AlertaSistema> findByLeidaFalseOrderByCreadoEnDesc();
    List<AlertaSistema> findByTipoAndLeidaFalse(TipoAlerta tipo);
    long countByLeidaFalse();
}
