package com.restaurante.service;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.dto.response.PensionadoPublicoResponse;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.entity.CicloPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PensionadoService {
    Pensionado registrar(PensionadoRequest request);
    Pensionado obtenerPorId(Long id);

    // ─── Autoservicio QR (sin login, por posesión del token) ───────
    /** Para el staff autenticado: devuelve el qrToken, generándolo si el pensionado aún no tiene uno. */
    String obtenerOGenerarQrToken(Long id);
    /** Vista pública de solo-consulta. 404 genérico tanto si el token no existe como si el pensionado no está activo. */
    PensionadoPublicoResponse obtenerPublicoPorQrToken(String qrToken);
    /** Marca la asistencia de hoy resolviendo el pensionado por su qrToken. Reusa registrarAsistencia(...). */
    AsistenciaPensionado registrarAsistenciaPorQrToken(String qrToken);
    List<Pensionado> listarActivos();
    List<Pensionado> listarActivos(Long sucursalId);
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

    // ─── Ciclo prepago de 26 días (modo CICLO_26D) ──────────────────
    CicloPensionado renovarCiclo(Long pensionadoId, Double montoPagado, Long usuarioId);
    Optional<CicloPensionado> consultarCiclo(Long pensionadoId);
}
