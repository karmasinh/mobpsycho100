package com.restaurante.service;

import com.restaurante.entity.UnidadMedida;
import com.restaurante.enums.TipoMagnitud;
import com.restaurante.repository.UnidadMedidaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class UnidadConversionServiceTest {

    @Mock private UnidadMedidaRepository unidadMedidaRepository;
    private UnidadConversionService service;

    @BeforeEach
    void setUp() {
        service = new UnidadConversionService(unidadMedidaRepository);

        lenient().when(unidadMedidaRepository.findByCodigo("ml"))
                .thenReturn(Optional.of(unidad("ml", TipoMagnitud.VOLUMEN, 1.0)));
        lenient().when(unidadMedidaRepository.findByCodigo("l"))
                .thenReturn(Optional.of(unidad("l", TipoMagnitud.VOLUMEN, 1000.0)));
        lenient().when(unidadMedidaRepository.findByCodigo("kg"))
                .thenReturn(Optional.of(unidad("kg", TipoMagnitud.MASA, 1000.0)));
        lenient().when(unidadMedidaRepository.findByCodigo("g"))
                .thenReturn(Optional.of(unidad("g", TipoMagnitud.MASA, 1.0)));
    }

    private UnidadMedida unidad(String codigo, TipoMagnitud tipo, double factor) {
        return UnidadMedida.builder().id(1L).codigo(codigo).nombre(codigo).tipoMagnitud(tipo).factorABase(factor).build();
    }

    @Test
    void normalizar_reconoceVariantesDeTextoLibre() {
        assertThat(service.normalizar("Litro")).contains("l");
        assertThat(service.normalizar(" litros ")).contains("l");
        assertThat(service.normalizar("Kg.")).contains("kg");
        assertThat(service.normalizar("mililitros")).contains("ml");
        assertThat(service.normalizar("texto-desconocido")).isEmpty();
    }

    @Test
    void convertir_mililitrosALitros() {
        // 250 ml consumidos de un insumo cuyo precio está fijado por litro
        Optional<Double> resultado = service.convertir(250, "ml", "Litro");
        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualTo(0.25);
    }

    @Test
    void convertir_gramosAKilogramos() {
        Optional<Double> resultado = service.convertir(500, "gramos", "kg");
        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualTo(0.5);
    }

    @Test
    void convertir_devuelveVacioSiLasMagnitudesNoCoinciden() {
        Optional<Double> resultado = service.convertir(1, "litro", "kg");
        assertThat(resultado).isEmpty();
    }

    @Test
    void convertir_devuelveVacioSiNoReconoceLaUnidad() {
        Optional<Double> resultado = service.convertir(1, "porciones", "kg");
        assertThat(resultado).isEmpty();
    }
}
