package com.restaurante.controller;

import com.restaurante.entity.CategoriaPlato;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.CategoriaPlatoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * CU-A-017: cierra las brechas de prueba pendientes (duplicados y desactivación)
 * dejadas abiertas en 04_CASOS_DE_USO.md.
 */
@ExtendWith(MockitoExtension.class)
class CategoriaPlatoControllerTest {

    @Mock private CategoriaPlatoRepository repository;

    private CategoriaPlatoController controller;

    @BeforeEach
    void setUp() {
        controller = new CategoriaPlatoController(repository);
    }

    @Test
    void crear_rechazaNombreDuplicado() {
        CategoriaPlato nueva = CategoriaPlato.builder().nombre("Entradas").build();
        when(repository.existsByNombre("Entradas")).thenReturn(true);

        assertThrows(DuplicadoException.class, () -> controller.crear(nueva));
        verify(repository, never()).save(any());
    }

    @Test
    void crear_asignaActivoTrueYGuarda() {
        CategoriaPlato nueva = CategoriaPlato.builder().nombre("Postres").build();
        when(repository.existsByNombre("Postres")).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CategoriaPlato guardada = controller.crear(nueva).getBody();

        assertThat(guardada.getActivo()).isTrue();
    }

    @Test
    void actualizar_rechazaRenombrarAUnNombreYaUsadoPorOtraCategoria() {
        CategoriaPlato existente = CategoriaPlato.builder().id(1L).nombre("Entradas").activo(true).build();
        CategoriaPlato request = CategoriaPlato.builder().nombre("Postres").build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.existsByNombre("Postres")).thenReturn(true);

        assertThrows(DuplicadoException.class, () -> controller.actualizar(1L, request));
        verify(repository, never()).save(any());
    }

    @Test
    void actualizar_permiteGuardarConElMismoNombreQueYaTenia() {
        CategoriaPlato existente = CategoriaPlato.builder().id(1L).nombre("Entradas").activo(true).build();
        CategoriaPlato request = CategoriaPlato.builder().nombre("Entradas").descripcion("Actualizada").build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CategoriaPlato resultado = controller.actualizar(1L, request).getBody();

        assertThat(resultado.getDescripcion()).isEqualTo("Actualizada");
        verify(repository, never()).existsByNombre(anyString());
    }

    @Test
    void desactivar_marcaActivoFalseYaNoLaLanzaComoNoEncontrada() {
        CategoriaPlato existente = CategoriaPlato.builder().id(1L).nombre("Entradas").activo(true).build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.desactivar(1L);

        assertThat(existente.getActivo()).isFalse();
    }

    @Test
    void desactivar_lanzaSiLaCategoriaNoExiste() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> controller.desactivar(99L));
    }
}
