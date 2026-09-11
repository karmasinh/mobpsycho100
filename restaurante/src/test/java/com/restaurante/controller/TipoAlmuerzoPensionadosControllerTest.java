package com.restaurante.controller;

import com.restaurante.entity.TipoAlmuerzo;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.TipoAlmuerzoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * CU-A-018: cierra la brecha de prueba pendiente en 04_CASOS_DE_USO.md — confirma
 * que editar la tarifa de un tipo de almuerzo no afecta cobros ya generados
 * (ver PensionadoServiceImplTest para la prueba del lado del cobro) y que el
 * catálogo respeta unicidad de nombre.
 */
@ExtendWith(MockitoExtension.class)
class TipoAlmuerzoPensionadosControllerTest {

    @Mock private TipoAlmuerzoRepository repository;

    private TipoAlmuerzoPensionadosController controller;

    @BeforeEach
    void setUp() {
        controller = new TipoAlmuerzoPensionadosController(repository);
    }

    @Test
    void crear_rechazaNombreDuplicado() {
        Map<String, Object> body = new HashMap<>();
        body.put("nombre", "Completo");
        body.put("precioMensual", 100.0);
        when(repository.existsByNombre("Completo")).thenReturn(true);

        assertThrows(DuplicadoException.class, () -> controller.crear(body));
        verify(repository, never()).save(any());
    }

    @Test
    void crear_rechazaNombreVacio() {
        Map<String, Object> body = new HashMap<>();
        body.put("nombre", "  ");

        assertThrows(NegocioException.class, () -> controller.crear(body));
    }

    @Test
    void actualizar_editarPrecioNoRequiereQueElNombreCambieYQuedaGuardado() {
        TipoAlmuerzo existente = TipoAlmuerzo.builder().id(1L).nombre("Completo").precioMensual(100.0).activo(true).build();
        Map<String, Object> body = new HashMap<>();
        body.put("nombre", "Completo");
        body.put("precioMensual", 150.0);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TipoAlmuerzo resultado = controller.actualizar(1L, body).getBody();

        assertThat(resultado.getPrecioMensual()).isEqualTo(150.0);
        verify(repository, never()).existsByNombre(anyString());
    }

    @Test
    void actualizar_rechazaRenombrarAUnNombreYaUsadoPorOtroTipo() {
        TipoAlmuerzo existente = TipoAlmuerzo.builder().id(1L).nombre("Completo").precioMensual(100.0).activo(true).build();
        Map<String, Object> body = new HashMap<>();
        body.put("nombre", "Ejecutivo");
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.existsByNombre("Ejecutivo")).thenReturn(true);

        assertThrows(DuplicadoException.class, () -> controller.actualizar(1L, body));
        verify(repository, never()).save(any());
    }

    @Test
    void desactivar_marcaActivoFalse() {
        TipoAlmuerzo existente = TipoAlmuerzo.builder().id(1L).nombre("Completo").precioMensual(100.0).activo(true).build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.desactivar(1L);

        assertThat(existente.getActivo()).isFalse();
    }
}
