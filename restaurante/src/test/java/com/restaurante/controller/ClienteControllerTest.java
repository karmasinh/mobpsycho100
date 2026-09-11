package com.restaurante.controller;

import com.restaurante.dto.request.ClienteRequest;
import com.restaurante.entity.Cliente;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.repository.ClienteRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.repository.AuditoriaLogRepository;
import com.restaurante.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Hallazgo real (2026-09-10, probado en emulador Android): `correo` tiene
 * UNIQUE en BD; el frontend envía "" (no null) cuando el campo queda vacío.
 * Como "" sí choca contra otro "" (a diferencia de NULL), el segundo cliente
 * sin correo registrado fallaba con un 500 genérico no controlado. Corregido
 * normalizando "" a null antes de validar/persistir.
 *
 * Hallazgo real #2 (2026-09-11, detectado al poblar datos de prueba vía API):
 * `telefono` tiene la misma UNIQUE en BD, y el controller sí validaba contra
 * duplicados pero nunca normalizaba "" a null — dos clientes distintos sin
 * teléfono no podían coexistir (409 "Ya existe un cliente con teléfono: ").
 * Corregido con el mismo tratamiento que correo.
 */
@ExtendWith(MockitoExtension.class)
class ClienteControllerTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private AuditoriaLogRepository auditoriaLogRepository;

    private ClienteController controller;

    @BeforeEach
    void setUp() {
        controller = new ClienteController(clienteRepository, sucursalRepository, auditoriaLogRepository);
    }

    private ClienteRequest requestConCorreo(String correo) {
        ClienteRequest r = new ClienteRequest();
        r.setNombre("Cliente de prueba");
        r.setTelefono("70000000");
        r.setCorreo(correo);
        return r;
    }

    @Test
    void crear_normalizaCorreoVacioANullEnVezDeGuardarloComoStringVacio() {
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Cliente creado = controller.crear(requestConCorreo("")).getBody();

        assertThat(creado.getCorreo()).isNull();
        verify(clienteRepository, never()).existsByCorreo(anyString());
    }

    @Test
    void crear_dosClientesSeguidosSinCorreoNoChocanEntreSi() {
        // Simula que ningún cliente existente tiene ese correo (ambos llegan como null, nunca se consulta).
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Cliente primero = controller.crear(requestConCorreo("")).getBody();
        Cliente segundo = controller.crear(requestConCorreo(null)).getBody();

        assertThat(primero.getCorreo()).isNull();
        assertThat(segundo.getCorreo()).isNull();
        verify(clienteRepository, never()).existsByCorreo(anyString());
    }

    @Test
    void crear_siGuardaUnCorreoRealSiValidaDuplicado() {
        when(clienteRepository.existsByCorreo("juan@example.com")).thenReturn(true);

        var request = requestConCorreo("juan@example.com");
        try {
            controller.crear(request);
            org.junit.jupiter.api.Assertions.fail("Debía lanzar DuplicadoException");
        } catch (DuplicadoException expected) {
            assertThat(expected.getMessage()).contains("juan@example.com");
        }
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void crear_normalizaTelefonoVacioANullEnVezDeGuardarloComoStringVacio() {
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ClienteRequest request = requestConCorreo("cliente@example.com");
        request.setTelefono("");

        Cliente creado = controller.crear(request).getBody();

        assertThat(creado.getTelefono()).isNull();
        verify(clienteRepository, never()).existsByTelefono(anyString());
    }

    @Test
    void crear_dosClientesSeguidosSinTelefonoNoChocanEntreSi() {
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ClienteRequest r1 = requestConCorreo("uno@example.com");
        r1.setTelefono("");
        ClienteRequest r2 = requestConCorreo("dos@example.com");
        r2.setTelefono(null);

        Cliente primero = controller.crear(r1).getBody();
        Cliente segundo = controller.crear(r2).getBody();

        assertThat(primero.getTelefono()).isNull();
        assertThat(segundo.getTelefono()).isNull();
        verify(clienteRepository, never()).existsByTelefono(anyString());
    }

    @Test
    void actualizar_normalizaCorreoVacioANull() {
        Cliente existente = Cliente.builder().id(1L).nombre("Original").telefono("70000000").correo("original@example.com").build();
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Cliente actualizado = controller.actualizar(1L, requestConCorreo(""), mock(UserDetailsImpl.class)).getBody();

        assertThat(actualizado.getCorreo()).isNull();
    }
}
