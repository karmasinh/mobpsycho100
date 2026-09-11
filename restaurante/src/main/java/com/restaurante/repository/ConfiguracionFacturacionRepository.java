package com.restaurante.repository;

import com.restaurante.entity.ConfiguracionFacturacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ConfiguracionFacturacionRepository extends JpaRepository<ConfiguracionFacturacion, Long> {

    Optional<ConfiguracionFacturacion> findBySucursalId(Long sucursalId);

    /**
     * Igual que {@link #findBySucursalId}, pero con lock pesimista para incrementar el
     * correlativo de factura sin que dos cajas emitiendo a la vez repitan un número.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ConfiguracionFacturacion c where c.sucursal.id = :sucursalId")
    Optional<ConfiguracionFacturacion> findBySucursalIdParaActualizar(Long sucursalId);
}
