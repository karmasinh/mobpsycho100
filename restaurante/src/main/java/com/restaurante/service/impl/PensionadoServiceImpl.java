package com.restaurante.service.impl;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.dto.response.PensionadoPublicoResponse;
import com.restaurante.entity.*;
import com.restaurante.enums.EstadoCiclo;
import com.restaurante.enums.EstadoPensionado;
import com.restaurante.enums.ModoFacturacionPensionado;
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
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final SucursalRepository sucursalRepository;
    private final CicloPensionadoRepository cicloPensionadoRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Pensionado registrar(PensionadoRequest request) {
        if (pensionadoRepository.existsByCedula(request.getCedula())) {
            throw new DuplicadoException("Ya existe un pensionado con cédula: " + request.getCedula());
        }

        if (request.getSucursalId() == null) {
            throw new NegocioException("La sucursal es obligatoria para registrar un pensionado.");
        }
        Sucursal sucursal = sucursalRepository.findById(request.getSucursalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", request.getSucursalId()));

        // El correo/teléfono son UNIQUE en BD — un "" (a diferencia de null) sí choca
        // contra otro "", así que se normaliza antes de validar y de persistir.
        String telefono = normalizarOpcional(request.getTelefono());
        String correo = normalizarOpcional(request.getCorreo());
        if (telefono != null && pensionadoRepository.existsByTelefono(telefono)) {
            throw new DuplicadoException("Ya existe un pensionado con teléfono: " + telefono);
        }
        if (correo != null && pensionadoRepository.existsByCorreo(correo)) {
            throw new DuplicadoException("Ya existe un pensionado con correo: " + correo);
        }

        TipoAlmuerzo tipoAlmuerzo = tipoAlmuerzoRepository.findById(request.getTipoAlmuerzoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("TipoAlmuerzo", request.getTipoAlmuerzoId()));

        ModoFacturacionPensionado modoFacturacion = request.getModoFacturacion() != null
                ? request.getModoFacturacion() : ModoFacturacionPensionado.MENSUAL;

        Pensionado pensionado = Pensionado.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .cedula(request.getCedula())
                .telefono(telefono)
                .correo(correo)
                .tipoAlmuerzo(tipoAlmuerzo)
                .sucursal(sucursal)
                .fechaInscripcion(request.getFechaInscripcion())
                .estado(EstadoPensionado.ACTIVO)
                .saldoPendiente(0.0)
                .qrToken(UUID.randomUUID().toString())
                .modoFacturacion(modoFacturacion)
                .build();

        pensionado = pensionadoRepository.save(pensionado);

        if (modoFacturacion == ModoFacturacionPensionado.CICLO_26D) {
            cicloPensionadoRepository.save(CicloPensionado.builder()
                    .pensionado(pensionado)
                    .fechaInicio(request.getFechaInscripcion())
                    .diasTotal(26)
                    .diasConsumidos(0)
                    .estado(EstadoCiclo.ACTIVO)
                    .montoPagado(0.0)
                    .build());
        }

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
    @Transactional(readOnly = true)
    public List<Pensionado> listarActivos(Long sucursalId) {
        if (sucursalId == null) {
            return listarActivos();
        }
        return pensionadoRepository.findByEstadoAndSucursal_Id(EstadoPensionado.ACTIVO, sucursalId);
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

        CicloPensionado ciclo = null;
        if (pensionado.getModoFacturacion() == ModoFacturacionPensionado.CICLO_26D) {
            ciclo = cicloPensionadoRepository.findByPensionado_IdAndEstado(pensionadoId, EstadoCiclo.ACTIVO)
                    .filter(c -> c.getDiasConsumidos() < c.getDiasTotal())
                    .orElseThrow(() -> new NegocioException(
                            "El pensionado no tiene ciclo activo. Debe renovar su pensión."));
        }

        Usuario registradoPor = usuarioId != null
                ? usuarioRepository.findById(usuarioId).orElse(null)
                : null;

        AsistenciaPensionado asistencia = asistenciaRepository.save(AsistenciaPensionado.builder()
                .pensionado(pensionado)
                .fecha(fecha)
                .asistio(true)
                .registradoPor(registradoPor)
                .build());

        if (ciclo != null) {
            ciclo.setDiasConsumidos(ciclo.getDiasConsumidos() + 1);
            if (ciclo.getDiasConsumidos() >= ciclo.getDiasTotal()) {
                ciclo.setEstado(EstadoCiclo.COMPLETADO);
                ciclo.setFechaFin(fecha);
            }
            cicloPensionadoRepository.save(ciclo);
        }

        return asistencia;
    }

    // ─── Ciclo prepago de 26 días ───────────────────────────────────

    @Override
    @Transactional
    public CicloPensionado renovarCiclo(Long pensionadoId, Double montoPagado, Long usuarioId) {
        Pensionado pensionado = obtenerPorId(pensionadoId);

        cicloPensionadoRepository.findByPensionado_IdAndEstado(pensionadoId, EstadoCiclo.ACTIVO)
                .ifPresent(anterior -> {
                    anterior.setEstado(EstadoCiclo.COMPLETADO);
                    anterior.setFechaFin(LocalDate.now());
                    cicloPensionadoRepository.save(anterior);
                });

        Usuario registradoPor = usuarioId != null
                ? usuarioRepository.findById(usuarioId).orElse(null)
                : null;

        CicloPensionado nuevo = CicloPensionado.builder()
                .pensionado(pensionado)
                .fechaInicio(LocalDate.now())
                .diasTotal(26)
                .diasConsumidos(0)
                .estado(EstadoCiclo.ACTIVO)
                .montoPagado(montoPagado)
                .registradoPor(registradoPor)
                .build();

        return cicloPensionadoRepository.save(nuevo);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CicloPensionado> consultarCiclo(Long pensionadoId) {
        return cicloPensionadoRepository.findByPensionado_IdAndEstado(pensionadoId, EstadoCiclo.ACTIVO);
    }

    // ─── Autoservicio QR ────────────────────────────────────────────

    @Override
    @Transactional
    public String obtenerOGenerarQrToken(Long id) {
        Pensionado pensionado = obtenerPorId(id);
        if (pensionado.getQrToken() == null || pensionado.getQrToken().isBlank()) {
            pensionado.setQrToken(UUID.randomUUID().toString());
            pensionado = pensionadoRepository.save(pensionado);
        }
        return pensionado.getQrToken();
    }

    @Override
    @Transactional(readOnly = true)
    public PensionadoPublicoResponse obtenerPublicoPorQrToken(String qrToken) {
        Pensionado pensionado = resolverPorQrTokenActivo(qrToken);

        List<PensionadoPublicoResponse.AsistenciaResumen> ultimas = asistenciaRepository
                .findByPensionado_IdOrderByFechaDesc(pensionado.getId())
                .stream()
                .limit(5)
                .map(a -> PensionadoPublicoResponse.AsistenciaResumen.builder()
                        .fecha(a.getFecha())
                        .asistio(a.getAsistio())
                        .build())
                .collect(Collectors.toList());

        return PensionadoPublicoResponse.builder()
                .nombre(pensionado.getNombre())
                .apellido(pensionado.getApellido())
                .tipoAlmuerzo(pensionado.getTipoAlmuerzo() != null
                        ? pensionado.getTipoAlmuerzo().getNombre() : null)
                .estado(pensionado.getEstado())
                .saldoPendiente(pensionado.getSaldoPendiente())
                .ultimasAsistencias(ultimas)
                .build();
    }

    @Override
    @Transactional
    public AsistenciaPensionado registrarAsistenciaPorQrToken(String qrToken) {
        Pensionado pensionado = resolverPorQrTokenActivo(qrToken);
        return registrarAsistencia(pensionado.getId(), LocalDate.now(), null);
    }

    /**
     * Resuelve un pensionado por qrToken para el autoservicio público, tratando
     * "token inexistente" y "pensionado existe pero no está activo" como el MISMO
     * 404 genérico — no hay que dejar adivinar, por el mensaje de error, si un
     * token corresponde a un pensionado real dado de baja.
     */
    private Pensionado resolverPorQrTokenActivo(String qrToken) {
        Pensionado pensionado = pensionadoRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pensionado no encontrado"));
        if (pensionado.getEstado() != EstadoPensionado.ACTIVO
                && pensionado.getEstado() != EstadoPensionado.REACTIVADO) {
            throw new RecursoNoEncontradoException("Pensionado no encontrado");
        }
        return pensionado;
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
        if (request.getMontoPagado() == null || request.getMontoPagado() <= 0) {
            throw new NegocioException("El monto pagado debe ser mayor a cero.");
        }

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

    /** El correo/teléfono tienen UNIQUE en BD — "" (a diferencia de null) sí choca con otro "". */
    private String normalizarOpcional(String valor) {
        return (valor == null || valor.isBlank()) ? null : valor;
    }
}
