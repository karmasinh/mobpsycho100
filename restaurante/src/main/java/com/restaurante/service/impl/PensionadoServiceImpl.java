package com.restaurante.service.impl;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.entity.*;
import com.restaurante.enums.EstadoPensionado;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.*;
import com.restaurante.service.PensionadoService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PensionadoServiceImpl implements PensionadoService {

    private static final Logger log = LoggerFactory.getLogger(PensionadoServiceImpl.class);

    private final PensionadoRepository pensionadoRepository;
    private final AsistenciaPensionadoRepository asistenciaRepository;
    private final CobroMensualRepository cobroMensualRepository;
    private final TipoAlmuerzoRepository tipoAlmuerzoRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Pensionado registrar(PensionadoRequest request) {
        if (pensionadoRepository.existsByCedula(request.getCedula())) {
            throw new DuplicadoException("Ya existe un pensionado con cédula: " + request.getCedula());
        }

        TipoAlmuerzo tipoAlmuerzo = tipoAlmuerzoRepository.findById(request.getTipoAlmuerzoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("TipoAlmuerzo", request.getTipoAlmuerzoId()));

        Pensionado pensionado = Pensionado.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .cedula(request.getCedula())
                .telefono(request.getTelefono())
                .correo(request.getCorreo())
                .tipoAlmuerzo(tipoAlmuerzo)
                .fechaInscripcion(request.getFechaInscripcion())
                .estado(EstadoPensionado.ACTIVO)
                .saldoPendiente(0.0)
                .build();

        pensionado = pensionadoRepository.save(pensionado);

        // Crear usuario automáticamente
        String username = resolverUsername(request.getUsernamePersonalizado(),
                request.getNombre(), request.getApellido());

        // Rol PENSIONADO por defecto (debe existir en la BD)
        Rol rolPensionado = rolRepository.findByNombre("PENSIONADO")
                .orElseGet(() -> rolRepository.save(Rol.builder()
                        .nombre("PENSIONADO")
                        .descripcion("Acceso básico para pensionados")
                        .activo(true)
                        .build()));

        Usuario usuario = Usuario.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPasswordInicial()))
                .rol(rolPensionado)
                .pensionado(pensionado)
                .activo(true)
                .intentosFallidos(0)
                .build();

        usuarioRepository.save(usuario);
        return pensionado;
    }

    @Override
    @Transactional(readOnly = true)
    public Pensionado obtenerPorId(Long id) {
        return pensionadoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pensionado", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pensionado> listarActivos() {
        return pensionadoRepository.findByEstado(EstadoPensionado.ACTIVO);
    }

    @Override
    @Transactional
    public void bajaVoluntaria(Long id) {
        Pensionado p = obtenerPorId(id);
        p.setEstado(EstadoPensionado.BAJA_VOLUNTARIA);
        p.setFechaBaja(LocalDate.now());
        pensionadoRepository.save(p);
        // Desactivar usuario
        usuarioRepository.findByPensionadoId(id)
                .ifPresent(u -> { u.setActivo(false); usuarioRepository.save(u); });
    }

    @Override
    @Transactional
    public void reactivar(Long id) {
        Pensionado p = obtenerPorId(id);
        if (p.getEstado() == EstadoPensionado.ACTIVO) {
            throw new NegocioException("El pensionado ya está activo.");
        }
        p.setEstado(EstadoPensionado.REACTIVADO);
        p.setFechaBaja(null);
        pensionadoRepository.save(p);
        usuarioRepository.findByPensionadoId(id)
                .ifPresent(u -> { u.setActivo(true); u.desbloquear(); usuarioRepository.save(u); });
    }

    @Override
    @Transactional
    public AsistenciaPensionado registrarAsistencia(Long pensionadoId, LocalDate fecha, Long usuarioId) {
        Pensionado pensionado = obtenerPorId(pensionadoId);

        if (pensionado.getEstado() != EstadoPensionado.ACTIVO
                && pensionado.getEstado() != EstadoPensionado.REACTIVADO) {
            throw new NegocioException("Solo se puede registrar asistencia para pensionados activos.");
        }

        if (asistenciaRepository.existsByPensionado_IdAndFecha(pensionadoId, fecha)) {
            throw new DuplicadoException("Ya se registró asistencia para este pensionado en la fecha: " + fecha);
        }

        Usuario registradoPor = usuarioRepository.findById(usuarioId).orElse(null);

        return asistenciaRepository.save(AsistenciaPensionado.builder()
                .pensionado(pensionado)
                .fecha(fecha)
                .asistio(true)
                .registradoPor(registradoPor)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AsistenciaPensionado> listarAsistencias(Long pensionadoId) {
        return asistenciaRepository.findByPensionado_IdOrderByFechaDesc(pensionadoId);
    }

    @Override
    @Transactional
    public CobroMensual generarCobroMensual(Long pensionadoId, int mes, int anio) {
        Pensionado pensionado = obtenerPorId(pensionadoId);

        if (cobroMensualRepository.existsByPensionado_IdAndMesAndAnio(pensionadoId, mes, anio)) {
            throw new DuplicadoException("Ya existe cobro generado para " + mes + "/" + anio);
        }

        int diasAsistidos = asistenciaRepository.countAsistenciasByMesAnio(pensionadoId, mes, anio);
        double montoBase = pensionado.getTipoAlmuerzo().getPrecioMensual();
        double saldoAnterior = pensionado.getSaldoPendiente();
        double total = montoBase + saldoAnterior;

        CobroMensual cobro = CobroMensual.builder()
                .pensionado(pensionado)
                .mes(mes)
                .anio(anio)
                .montoBase(montoBase)
                .saldoAnterior(saldoAnterior)
                .totalCobrado(total)
                .montoPagado(0.0)
                .saldoRestante(total)
                .diasAsistidos(diasAsistidos)
                .pagado(false)
                .build();

        return cobroMensualRepository.save(cobro);
    }

    @Override
    @Transactional
    public CobroMensual registrarPago(CobroMensualRequest request, Long usuarioId) {
        CobroMensual cobro = cobroMensualRepository
                .findByPensionado_IdAndMesAndAnio(request.getPensionadoId(),
                        request.getMes(), request.getAnio())
                .orElseGet(() -> generarCobroMensual(
                        request.getPensionadoId(), request.getMes(), request.getAnio()));

        if (Boolean.TRUE.equals(cobro.getPagado())) {
            throw new NegocioException("El cobro de " + request.getMes()
                    + "/" + request.getAnio() + " ya fue pagado.");
        }

        double nuevoPagado = cobro.getMontoPagado() + request.getMontoPagado();
        double saldoRestante = cobro.getTotalCobrado() - nuevoPagado;

        cobro.setMontoPagado(nuevoPagado);
        cobro.setSaldoRestante(Math.max(saldoRestante, 0.0));
        cobro.setFormaPago(request.getFormaPago());
        cobro.setFechaPago(LocalDate.now());

        if (saldoRestante <= 0) {
            cobro.setPagado(true);
            cobro.getPensionado().setSaldoPendiente(0.0);
        } else {
            cobro.getPensionado().setSaldoPendiente(saldoRestante);
        }

        Usuario registradoPor = usuarioRepository.findById(usuarioId).orElse(null);
        cobro.setRegistradoPor(registradoPor);

        pensionadoRepository.save(cobro.getPensionado());
        return cobroMensualRepository.save(cobro);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CobroMensual> listarCobros(Long pensionadoId) {
        return cobroMensualRepository.findByPensionado_IdOrderByAnioDescMesDesc(pensionadoId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CobroMensual> listarCobrosPendientes() {
        return cobroMensualRepository.findByPagadoFalseOrderByAnioAscMesAsc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CobroMensual> listarCobrosPorMes(int mes, int anio) {
        return cobroMensualRepository.findByMesAndAnioOrderByPensionado_ApellidoAsc(mes, anio);
    }

    @Override
    @Transactional
    public void procesarBajasAutomaticas() {
        LocalDate tresAnteriores = LocalDate.now().minusMonths(3);
        List<Pensionado> candidatos = pensionadoRepository.findActivosSinAsistenciaDesde(tresAnteriores);

        for (Pensionado p : candidatos) {
            p.setEstado(EstadoPensionado.BAJA_AUTOMATICA);
            p.setFechaBaja(LocalDate.now());
            pensionadoRepository.save(p);
            log.info("Baja automática aplicada al pensionado: {} {}", p.getNombre(), p.getApellido());
        }
    }

    // ─── helpers ──────────────────────────────────────────────────

    private String resolverUsername(String personalizado, String nombre, String apellido) {
        String username;
        if (personalizado != null && !personalizado.isBlank()) {
            username = personalizado.trim().toLowerCase();
        } else {
            username = (nombre.trim() + "." + apellido.trim())
                    .toLowerCase().replaceAll("\\s+", "")
                    .replaceAll("[áàä]", "a").replaceAll("[éèë]", "e")
                    .replaceAll("[íìï]", "i").replaceAll("[óòö]", "o")
                    .replaceAll("[úùü]", "u").replaceAll("[ñ]", "n");
        }
        if (usuarioRepository.existsByUsername(username)) {
            throw new DuplicadoException("El username '" + username
                    + "' ya está en uso. Use el campo usernamePersonalizado.");
        }
        return username;
    }
}
