package com.restaurante.service.ia;

import com.restaurante.dto.request.SugerenciaIaRequest;
import com.restaurante.exception.NegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SugerenciaIaServiceTest {

    @Mock private SugerenciaIaProvider gemini;
    @Mock private SugerenciaIaProvider claude;

    private SugerenciaIaService service;

    @BeforeEach
    void setUp() {
        service = new SugerenciaIaService(List.of(gemini, claude));
    }

    private SugerenciaIaRequest request(String proveedor) {
        SugerenciaIaRequest r = new SugerenciaIaRequest();
        r.setPlatoNombre("Silpancho");
        r.setIngredientes(List.of(Map.of("nombre", "Carne", "cantidad", 200, "unidad", "g")));
        r.setCostoTotal(15.0);
        r.setProveedor(proveedor);
        return r;
    }

    @Test
    void sugerirReceta_delegaAlProveedorSolicitado() {
        when(gemini.codigo()).thenReturn("GEMINI");
        when(gemini.sugerir(org.mockito.ArgumentMatchers.contains("Silpancho"))).thenReturn("Receta sugerida");

        String resultado = service.sugerirReceta(request("GEMINI"));

        assertThat(resultado).isEqualTo("Receta sugerida");
    }

    @Test
    void sugerirReceta_esInsensibleAMayusculas() {
        when(gemini.codigo()).thenReturn("GEMINI");
        when(claude.codigo()).thenReturn("CLAUDE");
        when(claude.sugerir(org.mockito.ArgumentMatchers.anyString())).thenReturn("ok");

        assertThat(service.sugerirReceta(request("claude"))).isEqualTo("ok");
    }

    @Test
    void sugerirReceta_rechazaProveedorDesconocido() {
        when(gemini.codigo()).thenReturn("GEMINI");
        when(claude.codigo()).thenReturn("CLAUDE");

        assertThrows(NegocioException.class, () -> service.sugerirReceta(request("OPENAI")));
    }

    @Test
    void proveedoresDisponibles_soloListaLosQueTienenClave() {
        when(gemini.disponible()).thenReturn(true);
        when(gemini.codigo()).thenReturn("GEMINI");
        when(claude.disponible()).thenReturn(false);

        assertThat(service.proveedoresDisponibles()).containsExactly("GEMINI");
    }
}
