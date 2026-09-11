package com.restaurante.siat;

import com.restaurante.entity.ConfiguracionFacturacion;
import com.restaurante.entity.DetallePedido;
import com.restaurante.entity.Factura;
import com.restaurante.entity.Pedido;
import com.restaurante.entity.Plato;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Venta;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica que {@link FacturaPdfBuilder} produce un PDF válido con el detalle real de la venta.
 *
 * <p>Limitación conocida: OpenPDF no trae extracción de texto (a diferencia de iText con
 * {@code PdfTextExtractor}), así que estos tests no verifican el contenido textual del PDF
 * carácter por carácter. En su lugar comprueban: (1) la firma de bytes {@code %PDF-} — la forma
 * estándar de confirmar que un archivo es un PDF válido sin parsearlo — y (2) que el tamaño
 * crece con la cantidad de líneas de detalle, como evidencia indirecta de que el contenido se
 * está incluyendo de verdad y no es un documento fijo/vacío.
 */
class FacturaPdfBuilderTest {

    private final FacturaPdfBuilder builder = new FacturaPdfBuilder();

    @Test
    void generarPdf_produceUnPdfConFirmaDeBytesValida() {
        byte[] pdf = builder.generarPdf(facturaDeEjemplo(1), configuracionDeEjemplo());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    @Test
    void generarPdf_funcionaSinDetallesDePedido() {
        Factura factura = facturaDeEjemplo(0);
        byte[] pdf = builder.generarPdf(factura, configuracionDeEjemplo());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    @Test
    void generarPdf_creceConMasLineasDeDetalle() {
        byte[] pdfConUnaLinea = builder.generarPdf(facturaDeEjemplo(1), configuracionDeEjemplo());
        byte[] pdfConCincoLineas = builder.generarPdf(facturaDeEjemplo(5), configuracionDeEjemplo());

        assertThat(pdfConCincoLineas.length).isGreaterThan(pdfConUnaLinea.length);
    }

    // ─── Datos de ejemplo ───────────────────────────────────────

    private ConfiguracionFacturacion configuracionDeEjemplo() {
        return ConfiguracionFacturacion.builder()
                .nit("1234567890")
                .razonSocial("La Entrerriana")
                .municipio("Santa Cruz de la Sierra")
                .build();
    }

    private Factura facturaDeEjemplo(int cantidadLineasDetalle) {
        Sucursal sucursal = Sucursal.builder().id(1L).nombre("Casa Matriz").build();

        List<DetallePedido> detalles = new java.util.ArrayList<>();
        for (int i = 0; i < cantidadLineasDetalle; i++) {
            detalles.add(DetallePedido.builder()
                    .plato(Plato.builder().nombre("Plato de prueba " + i).build())
                    .cantidad(2)
                    .precioUnitario(15.0)
                    .build());
        }

        Pedido pedido = Pedido.builder().id(50L).sucursal(sucursal).detalles(detalles).build();
        Venta venta = Venta.builder().id(100L).pedido(pedido).sucursal(sucursal)
                .totalCobrado(45.0).montoRecibido(50.0).vuelto(5.0).build();

        return Factura.builder()
                .id(9L)
                .venta(venta)
                .sucursal(sucursal)
                .numeroFactura(1L)
                .fechaEmision(LocalDateTime.now())
                .nitCliente("1234567")
                .tipoDocumento(1)
                .razonSocialCliente("Juan Pérez")
                .montoTotal(45.0)
                .build();
    }
}
