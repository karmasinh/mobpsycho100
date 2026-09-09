package com.restaurante.repository;

import com.restaurante.entity.CobroMensual;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CobroMensualRepository extends JpaRepository<CobroMensual, Long> {

    Optional<CobroMensual> findByPensionado_IdAndMesAndAnio(Long pensionadoId, Integer mes, Integer anio);

    boolean existsByPensionado_IdAndMesAndAnio(Long pensionadoId, Integer mes, Integer anio);

    List<CobroMensual> findByPensionado_IdOrderByAnioDescMesDesc(Long pensionadoId);

    List<CobroMensual> findByPagadoFalseOrderByAnioAscMesAsc();

    List<CobroMensual> findByMesAndAnioOrderByPensionado_ApellidoAsc(Integer mes, Integer anio);
}
