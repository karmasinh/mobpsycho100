package com.restaurante.service;

import com.restaurante.dto.request.ConfiguracionFacturacionRequest;
import com.restaurante.entity.*;
import com.restaurante.enums.EstadoFactura;
import com.restaurante.enums.FormaPago;
import com.restaurante.exception.NegocioException;
import com.restaurante.repository.*;
import com.restaurante.service.impl.FacturacionServiceImpl;
import com.restaurante.siat.ClienteSiat;
import com.restaurante.siat.FacturaPdfBuilder;
import com.restaurante.siat.FacturaXmlBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FacturacionServiceImplTest {

    @Mock private FacturaRepository facturaRepository;
    @Mock private ConfiguracionFacturacionRepository configuracionRepository;
    @Mock private VentaRepository ventaRepository;
    @Mock private SucursalRepository sucursalRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuditoriaLogRepository auditoriaLogRepository;
    @Spy  private ClienteSiat clienteSiat = new ClienteSiat();
    @Spy  private FacturaXmlBuilder xmlBuilder = new FacturaXmlBuilder();
    @Spy  private FacturaPdfBuilder pdfBuilder = new FacturaPdfBuilder();

    @InjectMocks
    private FacturacionServiceImpl facturacionService;

    private Sucursal sucursal;
    private Venta venta;
    private ConfiguracionFacturacion configHabilitada;

    @BeforeEach
    void setUp() {
        sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").activo(true).build();

        Pedido pedido = Pedido.builder().id(50L).sucursal(sucursal).detalles(java.util.List.of()).build();
        venta = Venta.builder()
                .id(100L)
                .pedido(pedido)
                .sucursal(sucursal)
                .totalCobrado(45.0)
                .montoRecibido(50.0)
                .vuelto(5.0)
                .formaPago(FormaPago.EFECTIVO)
                .anulada(false)
                .build();

        configHabilitada = ConfiguracionFacturacion.builder()
                .id(1L)
                .sucursal(sucursal)
                .nit("1234567890")
                .razonSocial("La Entrerriana")
                .facturacionHabilitada(true)
                .cuis("CUIS-DEMO-ABC12345")
                .cuisVigenteHasta(LocalDateTime.now().plusMonths(1))
                .cufd("CUFD-DEMO-XYZ98765")
                .cufdCodigoControl("CTRL-11112222")
                .cufdVigenteHasta(LocalDateTime.now().plusHours(12))
                .numeroFacturaActual(0L)
                .build();

        lenient().when(usuarioRepository.findById(any())).thenReturn(Optional.empty());
    }

    // ─── Emisión ────────────────────────────────────────────────

    @Test
    void emitir_generaXmlYQuedaPendiente() {
        when(ventaRepository.findById(100L)).thenReturn(Optional.of(venta));
        when(facturaRepository.findByVentaId(100L)).thenReturn(Optional.empty());
        when(configuracionRepository.findBySucursalIdParaActualizar(1L))
                .thenReturn(Optional.of(configHabilitada));
        when(facturaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(configuracionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Factura factura = facturacionService.emitir(
                100L, "1234567", 5, "Juan Pérez", null, null, null);

        assertThat(factura.getEstado()).isEqualTo(EstadoFactura.PENDIENTE);
        assertThat(factura.getEstado()).isNotEqualTo(EstadoFactura.ACEPTADA);
        assertThat(factura.getXmlGenerado()).isNotBlank();
        assertThat(factura.getXmlGenerado()).contains("facturaComputarizadaCompraVenta");
        assertThat(factura.getNumeroFactura()).isEqualTo(1L);
        assertThat(factura.getCuf()).startsWith("CUF-DEMO-");
    }

    @Test
    void emitir_rechazaVentaAnulada() {
        venta.setAnulada(true);
        when(ventaRepository.findById(100L)).thenReturn(Optional.of(venta));

        assertThrows(NegocioException.class, () ->
                facturacionService.emitir(100L, "0", null, "Consumidor final", null, null, null));
    }

    @Test
    void emitir_rechazaVentaYaFacturada() {
        when(ventaRepository.findById(100L)).thenReturn(Optional.of(venta));
        when(facturaRepository.findByVentaId(100L))
                .thenReturn(Optional.of(Factura.builder().numeroFactura(7L).build()));

        assertThrows(NegocioException.class, () ->
                facturacionService.emitir(100L, "0", null, "Consumidor final", null, null, null));
    }

    @Test
    void emitir_rechazaSinCufdVigente() {
        configHabilitada.setCufd(null);
        configHabilitada.setCufdVigenteHasta(null);
        when(ventaRepository.findById(100L)).thenReturn(Optional.of(venta));
        when(facturaRepository.findByVentaId(100L)).thenReturn(Optional.empty());
        when(configuracionRepository.findBySucursalIdParaActualizar(1L))
                .thenReturn(Optional.of(configHabilitada));

        assertThrows(NegocioException.class, () ->
                facturacionService.emitir(100L, "0", null, "Consumidor final", null, null, null));
    }

    // ─── PDF ────────────────────────────────────────────────────

    @Test
    void obtenerPdf_generaUnPdfNoVacioConFirmaValida() {
        Factura factura = Factura.builder()
                .id(9L).numeroFactura(1L).sucursal(sucursal)
                .venta(venta).montoTotal(45.0).nitCliente("1234567")
                .razonSocialCliente("Juan Pérez")
                .fechaEmision(LocalDateTime.now())
                .estado(EstadoFactura.PENDIENTE).build();
        when(facturaRepository.findById(9L)).thenReturn(Optional.of(factura));
        when(configuracionRepository.findBySucursalId(1L)).thenReturn(Optional.of(configHabilitada));

        byte[] pdf = facturacionService.obtenerPdf(9L);

        assertThat(pdf).isNotEmpty();
        assertThat(pdf.length).isGreaterThan(500); // un PDF de una sola página nunca es tan chico
        // Firma de bytes de un PDF válido: los primeros 5 bytes son "%PDF-".
        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    // ─── Reintentar ─────────────────────────────────────────────

    @Test
    void reintentar_fallaConMensajeClaroCuandoSiatNoEstaConfigurado() {
        Factura factura = Factura.builder()
                .id(9L).numeroFactura(1L).estado(EstadoFactura.PENDIENTE).build();
        when(facturaRepository.findById(9L)).thenReturn(Optional.of(factura));

        NegocioException ex = assertThrows(NegocioException.class,
                () -> facturacionService.reintentarEnvio(9L));

        assertThat(ex.getMessage()).contains("Conexión al SIN no configurada");
    }

    @Test
    void reintentar_rechazaFacturaAnulada() {
        Factura factura = Factura.builder()
                .id(9L).numeroFactura(1L).estado(EstadoFactura.ANULADA).build();
        when(facturaRepository.findById(9L)).thenReturn(Optional.of(factura));

        assertThrows(NegocioException.class, () -> facturacionService.reintentarEnvio(9L));
    }

    // ─── Anular ─────────────────────────────────────────────────

    @Test
    void anular_exigeMotivo() {
        Factura factura = Factura.builder()
                .id(9L).numeroFactura(1L).sucursal(sucursal).estado(EstadoFactura.PENDIENTE).build();
        when(facturaRepository.findById(9L)).thenReturn(Optional.of(factura));

        assertThrows(NegocioException.class, () ->
                facturacionService.anular(9L, 1, "  ", null));
    }

    @Test
    void anular_marcaEstadoAnuladaConMotivo() {
        Factura factura = Factura.builder()
                .id(9L).numeroFactura(1L).sucursal(sucursal).estado(EstadoFactura.PENDIENTE).build();
        when(facturaRepository.findById(9L)).thenReturn(Optional.of(factura));
        when(facturaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Factura anulada = facturacionService.anular(9L, 2, "Cliente se arrepintió", null);

        assertThat(anulada.getEstado()).isEqualTo(EstadoFactura.ANULADA);
        assertThat(anulada.getMotivoAnulacionDetalle()).isEqualTo("Cliente se arrepintió");
        assertThat(anulada.getAnuladaEn()).isNotNull();
    }

    @Test
    void anular_rechazaFacturaYaAnulada() {
        Factura factura = Factura.builder()
                .id(9L).numeroFactura(1L).sucursal(sucursal).estado(EstadoFactura.ANULADA).build();
        when(facturaRepository.findById(9L)).thenReturn(Optional.of(factura));

        assertThrows(NegocioException.class, () ->
                facturacionService.anular(9L, 2, "motivo", null));
    }

    // ─── Configuración ──────────────────────────────────────────

    @Test
    void configuracion_seGuardaYSeRecupera() {
        when(sucursalRepository.findById(1L)).thenReturn(Optional.of(sucursal));
        when(configuracionRepository.findBySucursalId(1L))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(ConfiguracionFacturacion.builder().sucursal(sucursal).build()));
        when(configuracionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConfiguracionFacturacionRequest request = new ConfiguracionFacturacionRequest();
        request.setNit("1234567890");
        request.setRazonSocial("La Entrerriana");

        ConfiguracionFacturacion guardada = facturacionService.guardarConfiguracion(1L, request);

        assertThat(guardada.getNit()).isEqualTo("1234567890");
        assertThat(guardada.getRazonSocial()).isEqualTo("La Entrerriana");
    }

    @Test
    void configuracion_devuelveDefaultSiNoExiste() {
        when(configuracionRepository.findBySucursalId(1L)).thenReturn(Optional.empty());
        when(sucursalRepository.findById(1L)).thenReturn(Optional.of(sucursal));

        ConfiguracionFacturacion config = facturacionService.obtenerConfiguracion(1L);

        assertThat(config.getFacturacionHabilitada()).isFalse();
        assertThat(config.getEstadoHabilitacion()).isEqualTo("DESHABILITADA");
    }

    @Test
    void configuracion_noPermiteHabilitarSinCufdVigente() {
        when(sucursalRepository.findById(1L)).thenReturn(Optional.of(sucursal));
        when(configuracionRepository.findBySucursalId(1L))
                .thenReturn(Optional.of(ConfiguracionFacturacion.builder().sucursal(sucursal).build()));

        ConfiguracionFacturacionRequest request = new ConfiguracionFacturacionRequest();
        request.setFacturacionHabilitada(true);

        assertThrows(NegocioException.class, () -> facturacionService.guardarConfiguracion(1L, request));
    }
}
