package com.restaurante.repository;

import com.restaurante.entity.LineaProduccion;
import com.restaurante.enums.TipoLineaProduccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LineaProduccionRepository extends JpaRepository<LineaProduccion, Long> {

    List<LineaProduccion> findByProduccionId(Long produccionId);

    List<LineaProduccion> findByProduccionIdAndTipo(Long produccionId, TipoLineaProduccion tipo);

    @Query("""
        SELECT lp FROM LineaProduccion lp
        JOIN lp.produccion pd
        WHERE pd.fecha = :fecha
          AND pd.sucursal.id = :sucursalId
          AND lp.tipo = :tipo
    """)
    List<LineaProduccion> findDisponiblesPorTipo(
            @Param("fecha") LocalDate fecha,
            @Param("sucursalId") Long sucursalId,
            @Param("tipo") TipoLineaProduccion tipo);

    @Query("""
        SELECT lp FROM LineaProduccion lp
        JOIN lp.produccion pd
        WHERE pd.fecha = :fecha
          AND pd.sucursal.id = :sucursalId
          AND lp.plato.id = :platoId
    """)
    Optional<LineaProduccion> findByFechaAndSucursalAndPlato(
            @Param("fecha") LocalDate fecha,
            @Param("sucursalId") Long sucursalId,
            @Param("platoId") Long platoId);

    @Modifying
    @Query("""
        UPDATE LineaProduccion lp
        SET lp.cantidadVendida = lp.cantidadVendida + :cantidad
        WHERE lp.id = :id
          AND lp.cantidadVendida + :cantidad <= lp.cantidadProducida
    """)
    int incrementarVendida(@Param("id") Long id, @Param("cantidad") int cantidad);

    @Modifying
    @Query("""
        UPDATE LineaProduccion lp
        SET lp.cantidadVendida = CASE WHEN lp.cantidadVendida - :cantidad < 0 THEN 0 ELSE lp.cantidadVendida - :cantidad END
        WHERE lp.id = :id
    """)
    void decrementarVendida(@Param("id") Long id, @Param("cantidad") int cantidad);
}
