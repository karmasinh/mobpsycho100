package com.restaurante.service;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.entity.CicloPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.TipoAlmuerzo;
import com.restaurante.enums.EstadoCiclo;
import com.restaurante.enums.ModoFacturacionPensionado;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.PensionadoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

@ExtendWith(MockitoExtension.class)
class PensionadoServiceImplTest {

    @Mock private PensionadoRepository pensionadoRepository;
    @Mock private AsistenciaPensionadoRepository asistenciaRepository;
    @Mock private CobroMensualRepository cobroMensualRepository;
    @Mock private TipoAlmuerzoRepository tipoAlmuerzoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private CicloPensionadoRepository cicloPensionadoRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private PensionadoServiceImpl pensionadoService;

    private Pensionado pensionado;

    @BeforeEach
    void setUp() {
        pensionadoService = new PensionadoServiceImpl(
                pensionadoRepository, asistenciaRepository, cobroMensualRepository,
                tipoAlmuerzoRepository, usuarioRepository, rolRepository, sucursalRepository,
                cicloPensionadoRepository, passwordEncoder);

        TipoAlmuerzo tipo = TipoAlmuerzo.builder().id(1L).nombre("Completo").precioMensual(100.0).build();
        Sucursal sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").build();
        pensionado = Pensionado.builder().id(20L).tipoAlmuerzo(tipo).sucursal(sucursal).saldoPendiente(15.0).build();
    }

    @Test
    void generarCobroMensual_arrastraElSaldoPendienteDelMesAnterior() {
        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(cobroMensualRepository.existsByPensionado_IdAndMesAndAnio(20L, 3, 2026)).thenReturn(false);
        when(asistenciaRepository.countAsistenciasByMesAnio(20L, 3, 2026)).thenReturn(18);
        when(cobroMensualRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CobroMensual cobro = pensionadoService.generarCobroMensual(20L, 3, 2026);

        assertThat(cobro.getMontoBase()).isEqualTo(100.0);
        assertThat(cobro.getSaldoAnterior()).isEqualTo(15.0);
        assertThat(cobro.getTotalCobrado()).isEqualTo(115.0);
        assertThat(cobro.getSaldoRestante()).isEqualTo(115.0);
        assertThat(cobro.getPagado()).isFalse();
    }

    @Test
    void generarCobroMensual_elMontoBaseQuedaComoInstantaneaYNoCambiaSiSeEditaElTipoDespues() {
        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(cobroMensualRepository.existsByPensionado_IdAndMesAndAnio(20L, 3, 2026)).thenReturn(false);
        when(asistenciaRepository.countAsistenciasByMesAnio(20L, 3, 2026)).thenReturn(18);
        when(cobroMensualRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CobroMensual cobro = pensionadoService.generarCobroMensual(20L, 3, 2026);
        assertThat(cobro.getMontoBase()).isEqualTo(100.0);

        // CU-A-018: editar la tarifa del tipo de almuerzo después de generar el cobro
        // no debe alterar el cobro ya emitido — montoBase queda como valor propio del registro.
        pensionado.getTipoAlmuerzo().setPrecioMensual(500.0);

        assertThat(cobro.getMontoBase()).isEqualTo(100.0);
    }

    @Test
    void registrar_normalizaTelefonoYCorreoVaciosANull() {
        // Hallazgo real (2026-09-10, probado en emulador Android): telefono/correo
        // tienen UNIQUE en BD; "" (a diferencia de null) sí choca contra otro "".
        PensionadoRequest request = new PensionadoRequest();
        request.setNombre("Ana"); request.setApellido("Gómez"); request.setCedula("1234567");
        request.setTelefono(""); request.setCorreo("");
        request.setTipoAlmuerzoId(1L);
        request.setSucursalId(1L);
        request.setFechaInscripcion(java.time.LocalDate.now());
        request.setUsernamePersonalizado("ana.test");
        request.setPasswordInicial("Clave123!");

        when(pensionadoRepository.existsByCedula("1234567")).thenReturn(false);
        when(tipoAlmuerzoRepository.findById(1L)).thenReturn(Optional.of(
                TipoAlmuerzo.builder().id(1L).nombre("Completo").precioMensual(100.0).build()));
        when(sucursalRepository.findById(1L)).thenReturn(Optional.of(
                Sucursal.builder().id(1L).nombre("Casa Matriz").build()));
        when(pensionadoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(rolRepository.findByNombre("PENSIONADO")).thenReturn(Optional.of(Rol.builder().id(1L).nombre("PENSIONADO").build()));
        when(usuarioRepository.existsByUsername("ana.test")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");

        Pensionado creado = pensionadoService.registrar(request);

        assertThat(creado.getTelefono()).isNull();
        assertThat(creado.getCorreo()).isNull();
        verify(pensionadoRepository, never()).existsByTelefono(anyString());
        verify(pensionadoRepository, never()).existsByCorreo(anyString());
    }

    @Test
    void registrar_rechazaSinSucursal() {
        PensionadoRequest request = new PensionadoRequest();
        request.setNombre("Ana"); request.setApellido("Gómez"); request.setCedula("1234567");
        request.setTipoAlmuerzoId(1L);
        request.setFechaInscripcion(java.time.LocalDate.now());
        request.setUsernamePersonalizado("ana.test");
        request.setPasswordInicial("Clave123!");

        when(pensionadoRepository.existsByCedula("1234567")).thenReturn(false);

        assertThrows(NegocioException.class, () -> pensionadoService.registrar(request));
    }

    @Test
    void listarActivos_filtraPorSucursalCuandoSeIndica() {
        pensionadoService.listarActivos(1L);
        verify(pensionadoRepository).findByEstadoAndSucursal_Id(com.restaurante.enums.EstadoPensionado.ACTIVO, 1L);
    }

    @Test
    void listarActivos_sinSucursalListaTodos() {
        pensionadoService.listarActivos(null);
        verify(pensionadoRepository).findByEstado(com.restaurante.enums.EstadoPensionado.ACTIVO);
    }

    @Test
    void generarCobroMensual_rechazaDuplicado() {
        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(cobroMensualRepository.existsByPensionado_IdAndMesAndAnio(20L, 3, 2026)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> pensionadoService.generarCobroMensual(20L, 3, 2026));
    }

    @Test
    void registrarPago_marcaPagadoCuandoElPagoCubreElTotal() {
        CobroMensual cobro = CobroMensual.builder()
                .id(50L).pensionado(pensionado).mes(3).anio(2026)
                .montoBase(100.0).saldoAnterior(15.0).totalCobrado(115.0)
                .montoPagado(0.0).saldoRestante(115.0).pagado(false)
                .build();
        when(cobroMensualRepository.findByPensionado_IdAndMesAndAnio(20L, 3, 2026))
                .thenReturn(Optional.of(cobro));
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        when(cobroMensualRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CobroMensualRequest request = new CobroMensualRequest();
        request.setPensionadoId(20L);
        request.setMes(3);
        request.setAnio(2026);
        request.setMontoPagado(115.0);

        CobroMensual resultado = pensionadoService.registrarPago(request, 99L);

        assertThat(resultado.getPagado()).isTrue();
        assertThat(resultado.getSaldoRestante()).isEqualTo(0.0);
        assertThat(pensionado.getSaldoPendiente()).isEqualTo(0.0);
    }

    @Test
    void registrarPago_rechazaMontoNoPositivo() {
        CobroMensualRequest request = new CobroMensualRequest();
        request.setPensionadoId(20L);
        request.setMes(3);
        request.setAnio(2026);
        request.setMontoPagado(0.0);

        assertThrows(NegocioException.class, () -> pensionadoService.registrarPago(request, 99L));

        CobroMensualRequest negativo = new CobroMensualRequest();
        negativo.setPensionadoId(20L);
        negativo.setMes(3);
        negativo.setAnio(2026);
        negativo.setMontoPagado(-5.0);

        assertThrows(NegocioException.class, () -> pensionadoService.registrarPago(negativo, 99L));
    }

    @Test
    void registrarPago_sobrepagoNoDejaSaldoNegativo() {
        CobroMensual cobro = CobroMensual.builder()
                .id(50L).pensionado(pensionado).mes(3).anio(2026)
                .montoBase(100.0).saldoAnterior(15.0).totalCobrado(115.0)
                .montoPagado(0.0).saldoRestante(115.0).pagado(false)
                .build();
        when(cobroMensualRepository.findByPensionado_IdAndMesAndAnio(20L, 3, 2026))
                .thenReturn(Optional.of(cobro));
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        when(cobroMensualRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CobroMensualRequest request = new CobroMensualRequest();
        request.setPensionadoId(20L);
        request.setMes(3);
        request.setAnio(2026);
        request.setMontoPagado(200.0); // paga más de lo que debe

        CobroMensual resultado = pensionadoService.registrarPago(request, 99L);

        assertThat(resultado.getPagado()).isTrue();
        assertThat(resultado.getSaldoRestante()).isEqualTo(0.0);
        assertThat(pensionado.getSaldoPendiente()).isEqualTo(0.0);
    }

    @Test
    void registrarPago_rechazaCobroYaPagado() {
        CobroMensual cobro = CobroMensual.builder()
                .id(50L).pensionado(pensionado).mes(3).anio(2026)
                .totalCobrado(115.0).montoPagado(115.0).saldoRestante(0.0).pagado(true)
                .build();
        when(cobroMensualRepository.findByPensionado_IdAndMesAndAnio(20L, 3, 2026))
                .thenReturn(Optional.of(cobro));

        CobroMensualRequest request = new CobroMensualRequest();
        request.setPensionadoId(20L);
        request.setMes(3);
        request.setAnio(2026);
        request.setMontoPagado(10.0);

        assertThrows(NegocioException.class, () -> pensionadoService.registrarPago(request, 99L));
    }

    @Test
    void registrarAsistencia_cicloSinActivoRechazaConMensajeExacto() {
        pensionado.setModoFacturacion(ModoFacturacionPensionado.CICLO_26D);
        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(asistenciaRepository.existsByPensionado_IdAndFecha(20L, LocalDate.of(2026, 3, 1))).thenReturn(false);
        when(cicloPensionadoRepository.findByPensionado_IdAndEstado(20L, EstadoCiclo.ACTIVO))
                .thenReturn(Optional.empty());

        NegocioException ex = assertThrows(NegocioException.class,
                () -> pensionadoService.registrarAsistencia(20L, LocalDate.of(2026, 3, 1), 99L));

        assertThat(ex.getMessage()).isEqualTo("El pensionado no tiene ciclo activo. Debe renovar su pensión.");
    }

    @Test
    void registrarAsistencia_consumeUnDiaDelCicloYNoRompeModoMensual() {
        // Modo MENSUAL (comportamiento por defecto): no debe tocar CicloPensionadoRepository
        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(asistenciaRepository.existsByPensionado_IdAndFecha(20L, LocalDate.of(2026, 3, 1))).thenReturn(false);
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        when(asistenciaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        pensionadoService.registrarAsistencia(20L, LocalDate.of(2026, 3, 1), 99L);

        verify(cicloPensionadoRepository, never()).findByPensionado_IdAndEstado(any(), any());
        verify(cicloPensionadoRepository, never()).save(any());
    }

    @Test
    void registrarAsistencia_cicloLlegaA26YSeMarcaCompletado() {
        pensionado.setModoFacturacion(ModoFacturacionPensionado.CICLO_26D);
        CicloPensionado ciclo = CicloPensionado.builder()
                .id(5L).pensionado(pensionado).fechaInicio(LocalDate.of(2026, 2, 1))
                .diasTotal(26).diasConsumidos(25).estado(EstadoCiclo.ACTIVO).montoPagado(100.0)
                .build();

        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(asistenciaRepository.existsByPensionado_IdAndFecha(20L, LocalDate.of(2026, 3, 1))).thenReturn(false);
        when(cicloPensionadoRepository.findByPensionado_IdAndEstado(20L, EstadoCiclo.ACTIVO))
                .thenReturn(Optional.of(ciclo));
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        when(asistenciaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(cicloPensionadoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        pensionadoService.registrarAsistencia(20L, LocalDate.of(2026, 3, 1), 99L);

        assertThat(ciclo.getDiasConsumidos()).isEqualTo(26);
        assertThat(ciclo.getEstado()).isEqualTo(EstadoCiclo.COMPLETADO);
        assertThat(ciclo.getFechaFin()).isEqualTo(LocalDate.of(2026, 3, 1));
    }

    @Test
    void renovarCiclo_cierraElAnteriorYAbreUnoNuevoCon26Dias() {
        CicloPensionado anterior = CicloPensionado.builder()
                .id(4L).pensionado(pensionado).fechaInicio(LocalDate.of(2026, 1, 1))
                .diasTotal(26).diasConsumidos(20).estado(EstadoCiclo.ACTIVO).montoPagado(100.0)
                .build();

        when(pensionadoRepository.findById(20L)).thenReturn(Optional.of(pensionado));
        when(cicloPensionadoRepository.findByPensionado_IdAndEstado(20L, EstadoCiclo.ACTIVO))
                .thenReturn(Optional.of(anterior));
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        when(cicloPensionadoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CicloPensionado nuevo = pensionadoService.renovarCiclo(20L, 100.0, 99L);

        assertThat(anterior.getEstado()).isEqualTo(EstadoCiclo.COMPLETADO);
        assertThat(anterior.getFechaFin()).isNotNull();
        assertThat(nuevo.getEstado()).isEqualTo(EstadoCiclo.ACTIVO);
        assertThat(nuevo.getDiasConsumidos()).isEqualTo(0);
        assertThat(nuevo.getDiasTotal()).isEqualTo(26);
        assertThat(nuevo.getMontoPagado()).isEqualTo(100.0);
    }
}
