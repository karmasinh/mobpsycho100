package com.restaurante.service;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;

import java.time.LocalDate;
import java.util.List;

public interface PensionadoService {
    Pensionado registrar(PensionadoRequest request);
    Pensionado obtenerPorId(Long id);
    List<Pensionado> listarActivos();
    void bajaVoluntaria(Long id);
    void reactivar(Long id);

    // Asistencia
    AsistenciaPensionado registrarAsistencia(Long pensionadoId, LocalDate fecha, Long usuarioId);
    List<AsistenciaPensionado> listarAsistencias(Long pensionadoId);

    // Cobro mensual
    CobroMensual generarCobroMensual(Long pensionadoId, int mes, int anio);
    CobroMensual registrarPago(CobroMensualRequest request, Long usuarioId);
    List<CobroMensual> listarCobros(Long pensionadoId);
    List<CobroMensual> listarCobrosPendientes();
    List<CobroMensual> listarCobrosPorMes(int mes, int anio);

    // Scheduler: baja automática por inasistencia > 3 meses
    void procesarBajasAutomaticas();
}
