package com.restaurante.repository;

import com.restaurante.entity.ConfiguracionTicket;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ConfiguracionTicketRepository extends JpaRepository<ConfiguracionTicket, Long> {

    Optional<ConfiguracionTicket> findBySucursalId(Long sucursalId);

    /**
     * Igual que {@link #findBySucursalId}, pero con lock pesimista para incrementar el
     * correlativo del ticket sin que dos cajas cobrando a la vez repitan un número.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ConfiguracionTicket c where c.sucursal.id = :sucursalId")
    Optional<ConfiguracionTicket> findBySucursalIdParaActualizar(Long sucursalId);
}
