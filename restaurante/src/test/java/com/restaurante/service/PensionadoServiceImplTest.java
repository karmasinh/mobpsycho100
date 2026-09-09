package com.restaurante.service;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;
import com.restaurante.entity.TipoAlmuerzo;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.PensionadoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class PensionadoServiceImplTest {

    @Mock private PensionadoRepository pensionadoRepository;
    @Mock private AsistenciaPensionadoRepository asistenciaRepository;
    @Mock private CobroMensualRepository cobroMensualRepository;
    @Mock private TipoAlmuerzoRepository tipoAlmuerzoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private PensionadoServiceImpl pensionadoService;

    private Pensionado pensionado;

    @BeforeEach
    void setUp() {
        pensionadoService = new PensionadoServiceImpl(
                pensionadoRepository, asistenciaRepository, cobroMensualRepository,
                tipoAlmuerzoRepository, usuarioRepository, rolRepository, passwordEncoder);

        TipoAlmuerzo tipo = TipoAlmuerzo.builder().id(1L).nombre("Completo").precioMensual(100.0).build();
        pensionado = Pensionado.builder().id(20L).tipoAlmuerzo(tipo).saldoPendiente(15.0).build();
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
}
