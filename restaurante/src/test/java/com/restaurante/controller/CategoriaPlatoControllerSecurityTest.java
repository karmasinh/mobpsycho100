package com.restaurante.controller;

import com.restaurante.config.SecurityConfig;
import com.restaurante.entity.ModuloMenu;
import com.restaurante.entity.Rol;
import com.restaurante.entity.Usuario;
import com.restaurante.repository.CategoriaPlatoRepository;
import com.restaurante.security.PermisoEvaluator;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.security.UserDetailsServiceImpl;
import com.restaurante.security.filters.JwtAuthenticationFilter;
import com.restaurante.security.jwt.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.stream.Collectors;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RF-A-015 / RF-L-013: primer test del proyecto que ejercita la expresión
 * {@code @PreAuthorize} REAL tal como está escrita en el controller, en vez de
 * reconstruirla en el test (lo que {@code PermisoMatrizTest} y
 * {@code PermisoEvaluatorTest} no pueden detectar: un typo en el SpEL del
 * controller seguiría "pasando" esos tests aunque el endpoint quedara mal
 * protegido). {@code CategoriaPlatoController.crear()} usa el patrón mixto
 * {@code hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication,'MOD_CATEGORIAS_PLATO')}
 * — se elige como representativo porque ejercita ambas mitades del OR aditivo.
 */
@WebMvcTest(controllers = CategoriaPlatoController.class)
@Import({SecurityConfig.class, PermisoEvaluator.class, CategoriaPlatoControllerSecurityTest.TestBeans.class})
class CategoriaPlatoControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private CategoriaPlatoRepository repository;

    private static final String BODY = "{\"nombre\":\"Postres\"}";

    @TestConfiguration
    static class TestBeans {
        @Bean
        JwtUtils jwtUtils() {
            return mock(JwtUtils.class);
        }

        @Bean
        UserDetailsServiceImpl userDetailsService() {
            return mock(UserDetailsServiceImpl.class);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(JwtUtils jwtUtils, UserDetailsServiceImpl uds) {
            // Filtro real (no mock de la clase): sin cabecera Authorization en la
            // request de prueba, su rama de trabajo real es un no-op que deja pasar
            // la cadena — mockear la clase entera rompería el filter chain de MockMvc.
            return new JwtAuthenticationFilter(jwtUtils, uds);
        }
    }

    @Test
    void crear_sinAutenticacion_esRechazado() throws Exception {
        mockMvc.perform(post("/categorias-plato").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void crear_conRolAdmin_esPermitidoPorHasAnyRole() throws Exception {
        when(repository.existsByNombre("Postres")).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/categorias-plato")
                        .with(authentication(tokenPara("ADMIN", Set.of())))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated());
    }

    @Test
    void crear_sinRolDeSistemaPeroConModuloAsignado_esPermitidoPorPermEvaluator() throws Exception {
        when(repository.existsByNombre("Postres")).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/categorias-plato")
                        .with(authentication(tokenPara("CAJERO", Set.of("MOD_CATEGORIAS_PLATO"))))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated());
    }

    @Test
    void crear_sinRolYSinModulo_esRechazado() throws Exception {
        mockMvc.perform(post("/categorias-plato")
                        .with(authentication(tokenPara("CAJERO", Set.of())))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
    }

    private UsernamePasswordAuthenticationToken tokenPara(String rolNombre, Set<String> modulosCodigos) {
        Rol rol = Rol.builder().id(1L).nombre(rolNombre).activo(true)
                .modulos(modulosCodigos.stream()
                        .map(codigo -> ModuloMenu.builder().id(1L).codigo(codigo).nombre(codigo).activo(true).build())
                        .collect(Collectors.toSet()))
                .build();
        Usuario usuario = Usuario.builder().id(1L).username("test").passwordHash("x").rol(rol).activo(true).build();
        UserDetailsImpl userDetails = new UserDetailsImpl(usuario);
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }
}
