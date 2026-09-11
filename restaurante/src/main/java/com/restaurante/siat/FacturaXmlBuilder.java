package com.restaurante.siat;

import com.restaurante.entity.ConfiguracionFacturacion;
import com.restaurante.entity.DetallePedido;
import com.restaurante.entity.Factura;
import com.restaurante.entity.Venta;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Genera localmente el XML de la factura de compra-venta.
 *
 * <p>Se construye siempre al emitir, haya o no conexión con el SIN: es el documento en sí, no
 * un mensaje de red. Sigue —a grandes rasgos, simplificado para estos cimientos— la forma del
 * esquema publicado por el SIN para la modalidad computarizada, pero <b>no está validado
 * contra el XSD oficial</b> ni lleva firma digital: antes de usarse contra un ambiente real
 * del SIN hay que contrastarlo con el XSD vigente.
 */
@Component
public class FacturaXmlBuilder {

    private static final DateTimeFormatter FECHA_XML =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");

    public String construir(Factura factura, ConfiguracionFacturacion config, Venta venta) {
        StringBuilder xml = new StringBuilder(1024);

        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<!-- Documento generado localmente. Cimientos de facturación electrónica: ")
           .append("no fue enviado ni validado por el SIN. -->\n");
        xml.append("<facturaComputarizadaCompraVenta>\n");

        agregarCabecera(xml, factura, config);
        agregarDetalles(xml, factura, venta);

        xml.append("</facturaComputarizadaCompraVenta>");
        return xml.toString();
    }

    private void agregarCabecera(StringBuilder xml, Factura f, ConfiguracionFacturacion c) {
        xml.append("  <cabecera>\n");
        elemento(xml, "nitEmisor", c.getNit());
        elemento(xml, "razonSocialEmisor", c.getRazonSocial());
        elemento(xml, "municipio", c.getMunicipio());
        elemento(xml, "numeroFactura", String.valueOf(f.getNumeroFactura()));
        elemento(xml, "cuf", f.getCuf());
        elemento(xml, "fechaEmision", f.getFechaEmision().format(FECHA_XML));
        elemento(xml, "nombreRazonSocialComprador", f.getRazonSocialCliente());
        elemento(xml, "codigoTipoDocumentoIdentidad",
                f.getTipoDocumento() == null ? "1" : String.valueOf(f.getTipoDocumento()));
        elemento(xml, "numeroDocumento", f.getNitCliente());
        elemento(xml, "complemento", f.getComplemento());
        elemento(xml, "montoTotal", importe(f.getMontoTotal()));
        elemento(xml, "leyenda", c.getLeyendaFactura());
        elemento(xml, "ambiente", c.getAmbiente() == null ? "PRUEBAS" : c.getAmbiente().name());
        xml.append("  </cabecera>\n");
    }

    private void agregarDetalles(StringBuilder xml, Factura f, Venta venta) {
        List<DetallePedido> detalles = venta.getPedido() != null
                ? venta.getPedido().getDetalles() : List.of();

        if (detalles == null || detalles.isEmpty()) {
            agregarLinea(xml, "Consumo", 1, f.getMontoTotal());
            return;
        }
        for (DetallePedido d : detalles) {
            double subtotal = d.getPrecioUnitario() * d.getCantidad();
            agregarLinea(xml, descripcion(d), d.getCantidad(), subtotal);
        }
    }

    private void agregarLinea(StringBuilder xml, String descripcion, int cantidad, double subtotal) {
        xml.append("  <detalle>\n");
        elemento(xml, "descripcion", descripcion);
        elemento(xml, "cantidad", String.valueOf(cantidad));
        elemento(xml, "subTotal", importe(subtotal));
        xml.append("  </detalle>\n");
    }

    private String descripcion(DetallePedido d) {
        StringBuilder texto = new StringBuilder(
                d.getPlato() != null ? d.getPlato().getNombre() : "Plato");
        if (d.getSopaSeleccionada() != null || d.getSegundoSeleccionado() != null) {
            texto.append(" (");
            if (d.getSopaSeleccionada() != null) texto.append(d.getSopaSeleccionada().getNombre());
            if (d.getSopaSeleccionada() != null && d.getSegundoSeleccionado() != null) texto.append(" + ");
            if (d.getSegundoSeleccionado() != null) texto.append(d.getSegundoSeleccionado().getNombre());
            texto.append(")");
        }
        return texto.toString();
    }

    private String importe(Double valor) {
        return String.format(Locale.US, "%.2f", valor == null ? 0.0 : valor);
    }

    private void elemento(StringBuilder xml, String nombre, String valor) {
        if (valor == null || valor.isBlank()) {
            xml.append("    <").append(nombre).append("/>\n");
        } else {
            xml.append("    <").append(nombre).append('>')
               .append(escapar(valor))
               .append("</").append(nombre).append(">\n");
        }
    }

    private String escapar(String texto) {
        return texto.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&apos;");
    }
}
