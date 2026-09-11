package com.restaurante.siat;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfGState;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.restaurante.entity.ConfiguracionFacturacion;
import com.restaurante.entity.DetallePedido;
import com.restaurante.entity.Factura;
import com.restaurante.entity.Venta;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Genera localmente el PDF de la factura, con el formato visual del estándar boliviano de
 * facturación (SIAT/SIN): encabezado con emisor, datos del documento, datos del comprador,
 * detalle de ítems, totales (en números y en letras), código de control y leyenda legal.
 *
 * <p>Mismo criterio de honestidad que {@link FacturaXmlBuilder} y el resto de la Fase C: este
 * PDF <b>no es un documento fiscal válido</b>. Tres cosas lo dejan explícito:
 * <ol>
 *   <li>El "Código de autorización" muestra literalmente {@code CIMIENTOS-DEMO} en vez de
 *       fingir un código real del SIN.</li>
 *   <li>El "código de control" se calcula acá con un hash local corto (no es el algoritmo real
 *       del SIN, que es secreto) — se etiqueta como "(simulado)".</li>
 *   <li>El QR codifica una URL local de demostración (no un enlace real de impuestos.gob.bo) y,
 *       además, el documento lleva una marca de agua diagonal semitransparente y un pie de
 *       página aclarando que es un proyecto académico sin validez fiscal.</li>
 * </ol>
 */
@Component
public class FacturaPdfBuilder {

    private static final DateTimeFormatter FECHA_LEGIBLE =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /** Dorado usado en el tema "Entrerriana" del frontend (styles.css, --color-primary del tema). */
    private static final Color DORADO = new Color(196, 154, 90);
    private static final Color GRIS_TEXTO = new Color(80, 80, 80);
    private static final Color GRIS_CLARO = new Color(235, 235, 235);

    private static final Font FUENTE_LOGO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, DORADO);
    private static final Font FUENTE_TITULO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.BLACK);
    private static final Font FUENTE_ETIQUETA = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, GRIS_TEXTO);
    private static final Font FUENTE_VALOR = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    private static final Font FUENTE_NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    private static final Font FUENTE_NORMAL_NEGRITA = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
    private static final Font FUENTE_PEQUENA = FontFactory.getFont(FontFactory.HELVETICA, 7, GRIS_TEXTO);
    private static final Font FUENTE_LEGAL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, Color.BLACK);

    /**
     * Construye el PDF completo de la factura.
     *
     * @param factura entidad ya persistida, con su venta/pedido/detalles cargados
     * @param config  datos fiscales de la sucursal (NIT/razón social/municipio del emisor)
     * @return los bytes del PDF, listos para servirse como {@code application/pdf}
     */
    public byte[] generarPdf(Factura factura, ConfiguracionFacturacion config) {
        Document documento = new Document(PageSize.A4, 36, 36, 30, 40);
        ByteArrayOutputStream salida = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(documento, salida);
            writer.setPageEvent(new MarcaDeAguaYPie());
            documento.open();

            agregarEncabezado(documento, factura, config);
            agregarDatosDocumento(documento, factura);
            agregarDatosComprador(documento, factura);
            agregarDetalle(documento, factura);
            agregarTotales(documento, factura);
            agregarQrYControl(documento, factura, config);
            agregarLeyendaLegal(documento);

            documento.close();
            return salida.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("No se pudo generar el PDF de la factura " + factura.getId(), e);
        }
    }

    // ─── Secciones ──────────────────────────────────────────────

    private void agregarEncabezado(Document doc, Factura f, ConfiguracionFacturacion c) throws DocumentException {
        // Sin logo/imagen propio en el proyecto (se revisó Fronten/Ventas/src/assets/): se usa
        // el nombre estilizado con el color dorado del tema "Entrerriana" ya usado en el ticket.
        PdfPTable cabecera = new PdfPTable(2);
        cabecera.setWidthPercentage(100);
        cabecera.setWidths(new float[]{2f, 1f});

        PdfPCell celdaLogo = new PdfPCell();
        celdaLogo.setBorder(Rectangle.NO_BORDER);
        celdaLogo.addElement(new Paragraph(nombreEmisor(c), FUENTE_LOGO));
        celdaLogo.addElement(espacio(2));
        celdaLogo.addElement(new Paragraph("NIT: " + valorODefault(c.getNit()), FUENTE_VALOR));
        celdaLogo.addElement(new Paragraph(
                "Municipio: " + valorODefault(c.getMunicipio()), FUENTE_VALOR));
        cabecera.addCell(celdaLogo);

        PdfPCell celdaTitulo = new PdfPCell();
        celdaTitulo.setBorder(Rectangle.BOX);
        celdaTitulo.setBorderColor(DORADO);
        celdaTitulo.setPadding(8);
        Paragraph titulo = new Paragraph("FACTURA", FUENTE_TITULO);
        titulo.setAlignment(Element.ALIGN_CENTER);
        celdaTitulo.addElement(titulo);
        Paragraph codigoAutorizacion = new Paragraph("Código de autorización:", FUENTE_ETIQUETA);
        codigoAutorizacion.setAlignment(Element.ALIGN_CENTER);
        celdaTitulo.addElement(codigoAutorizacion);
        Paragraph codigoAutorizacionValor = new Paragraph("CIMIENTOS-DEMO", FUENTE_NORMAL_NEGRITA);
        codigoAutorizacionValor.setAlignment(Element.ALIGN_CENTER);
        celdaTitulo.addElement(codigoAutorizacionValor);
        cabecera.addCell(celdaTitulo);

        doc.add(cabecera);
        doc.add(espacio(6));
    }

    private void agregarDatosDocumento(Document doc, Factura f) throws DocumentException {
        PdfPTable tabla = new PdfPTable(4);
        tabla.setWidthPercentage(100);

        tabla.addCell(celdaEtiquetaValor("N° de factura", String.valueOf(f.getNumeroFactura())));
        tabla.addCell(celdaEtiquetaValor("Fecha de emisión",
                f.getFechaEmision() != null ? f.getFechaEmision().format(FECHA_LEGIBLE) : "—"));
        tabla.addCell(celdaEtiquetaValor("Fecha límite de emisión (+10 días, placeholder)",
                f.getFechaEmision() != null
                        ? f.getFechaEmision().plusDays(10).format(FECHA_LEGIBLE) : "—"));
        tabla.addCell(celdaEtiquetaValor("Lugar de emisión",
                valorODefault(f.getSucursal() != null ? f.getSucursal().getNombre() : null)));

        doc.add(tabla);
        doc.add(espacio(6));
    }

    private void agregarDatosComprador(Document doc, Factura f) throws DocumentException {
        PdfPTable tabla = new PdfPTable(3);
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(2);

        PdfPCell encabezado = new PdfPCell(new Phrase("Datos del comprador", FUENTE_ETIQUETA));
        encabezado.setColspan(3);
        encabezado.setBackgroundColor(GRIS_CLARO);
        encabezado.setBorder(Rectangle.NO_BORDER);
        encabezado.setPadding(3);
        tabla.addCell(encabezado);

        tabla.addCell(celdaEtiquetaValor("Nombre / Razón social", valorODefault(f.getRazonSocialCliente())));
        tabla.addCell(celdaEtiquetaValor(
                tipoDocumentoLabel(f.getTipoDocumento()), valorODefault(f.getNitCliente())));
        tabla.addCell(celdaEtiquetaValor("Complemento", valorOVacio(f.getComplemento())));

        doc.add(tabla);
        doc.add(espacio(6));
    }

    private void agregarDetalle(Document doc, Factura f) throws DocumentException {
        PdfPTable tabla = new PdfPTable(4);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{1f, 4f, 1.4f, 1.4f});
        tabla.setSpacingBefore(4);

        agregarEncabezadoDetalle(tabla, "Cant.");
        agregarEncabezadoDetalle(tabla, "Descripción");
        agregarEncabezadoDetalle(tabla, "P. Unit. (Bs)");
        agregarEncabezadoDetalle(tabla, "Subtotal (Bs)");

        List<DetallePedido> detalles = detallesDe(f.getVenta());
        if (detalles.isEmpty()) {
            agregarLineaDetalle(tabla, "1", "Consumo", f.getMontoTotal(), f.getMontoTotal());
        } else {
            for (DetallePedido d : detalles) {
                double subtotal = (d.getPrecioUnitario() == null ? 0.0 : d.getPrecioUnitario())
                        * (d.getCantidad() == null ? 0 : d.getCantidad());
                agregarLineaDetalle(tabla, String.valueOf(d.getCantidad()), descripcion(d),
                        d.getPrecioUnitario(), subtotal);
            }
        }

        doc.add(tabla);
    }

    private void agregarTotales(Document doc, Factura f) throws DocumentException {
        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{3f, 1.3f});
        tabla.setSpacingBefore(4);

        PdfPCell celdaLetras = new PdfPCell(new Phrase(
                NumeroALetrasConverter.importeEnLetras(f.getMontoTotal()), FUENTE_NORMAL));
        celdaLetras.setBorder(Rectangle.BOX);
        celdaLetras.setPadding(5);
        tabla.addCell(celdaLetras);

        PdfPCell celdaTotal = new PdfPCell(new Phrase(
                "TOTAL: Bs " + String.format(Locale.US, "%.2f",
                        f.getMontoTotal() == null ? 0.0 : f.getMontoTotal()), FUENTE_NORMAL_NEGRITA));
        celdaTotal.setBorder(Rectangle.BOX);
        celdaTotal.setPadding(5);
        celdaTotal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        celdaTotal.setVerticalAlignment(Element.ALIGN_MIDDLE);
        tabla.addCell(celdaTotal);

        doc.add(tabla);
        doc.add(espacio(6));
    }

    private void agregarQrYControl(Document doc, Factura f, ConfiguracionFacturacion c) throws DocumentException {
        String codigoControl = codigoControlSimulado(f);

        // URL claramente local/demo: nunca un enlace real del SIN (impuestos.gob.bo).
        String urlDemo = String.format(Locale.US,
                "http://localhost:8080/api/facturacion/%d/verificacion-demo?nit=%s&numero=%s&tamano=%s",
                f.getId(), urlEncode(valorODefault(c.getNit())), f.getNumeroFactura(), "7x7");

        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{1f, 3f});
        tabla.setSpacingBefore(4);

        PdfPCell celdaQr = new PdfPCell();
        celdaQr.setBorder(Rectangle.NO_BORDER);
        celdaQr.setVerticalAlignment(Element.ALIGN_MIDDLE);
        try {
            celdaQr.addElement(generarImagenQr(urlDemo));
        } catch (WriterException | IOException | com.lowagie.text.BadElementException e) {
            celdaQr.addElement(new Paragraph("(QR no disponible)", FUENTE_PEQUENA));
        }
        tabla.addCell(celdaQr);

        PdfPCell celdaTexto = new PdfPCell();
        celdaTexto.setBorder(Rectangle.NO_BORDER);
        celdaTexto.setVerticalAlignment(Element.ALIGN_MIDDLE);
        celdaTexto.addElement(new Paragraph("Código de control (simulado): " + codigoControl, FUENTE_NORMAL));
        celdaTexto.addElement(new Paragraph(
                "El QR apunta a una URL local de demostración, NO a una verificación real del SIN "
              + "(impuestos.gob.bo). El código de control se calcula localmente y no es el "
              + "algoritmo real del SIN, que es secreto.", FUENTE_PEQUENA));
        tabla.addCell(celdaTexto);

        doc.add(tabla);
        doc.add(espacio(6));
    }

    private void agregarLeyendaLegal(Document doc) throws DocumentException {
        Paragraph leyenda = new Paragraph(
                "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS. EL USO ILÍCITO DE ESTE DOCUMENTO "
              + "SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY.", FUENTE_LEGAL);
        leyenda.setAlignment(Element.ALIGN_CENTER);
        leyenda.setSpacingBefore(8);
        doc.add(leyenda);
    }

    // ─── Helpers de contenido ───────────────────────────────────

    private String nombreEmisor(ConfiguracionFacturacion c) {
        return valorOVacio(c.getRazonSocial()).isEmpty() ? "La Entrerriana" : c.getRazonSocial();
    }

    private String tipoDocumentoLabel(Integer tipoDocumento) {
        // Catálogo simplificado del SIN: 1=CI, 5=NIT (los usados por este proyecto).
        if (tipoDocumento != null && tipoDocumento == 5) return "NIT";
        return "NIT / Carnet de identidad";
    }

    private List<DetallePedido> detallesDe(Venta venta) {
        if (venta == null || venta.getPedido() == null || venta.getPedido().getDetalles() == null) {
            return List.of();
        }
        return venta.getPedido().getDetalles();
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

    /**
     * Código de control local, determinístico (no es el algoritmo real del SIN, que es
     * secreto): hash SHA-256 corto de numeroFactura+nit+monto+fecha, en hexadecimal mayúscula.
     */
    private String codigoControlSimulado(Factura f) {
        String base = f.getNumeroFactura() + "|" + valorOVacio(f.getNitCliente()) + "|"
                + (f.getMontoTotal() == null ? "0" : f.getMontoTotal()) + "|"
                + (f.getFechaEmision() == null ? "" : f.getFechaEmision());
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] hash = sha256.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02X", b));
            return hex.substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 siempre está disponible en la JVM estándar; esto no debería pasar nunca.
            return "SIN-HASH-" + base.hashCode();
        }
    }

    private Image generarImagenQr(String contenido)
            throws WriterException, IOException, com.lowagie.text.BadElementException {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 1);

        BitMatrix matriz = new QRCodeWriter().encode(contenido, BarcodeFormat.QR_CODE, 150, 150, hints);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matriz, "PNG", png);

        Image imagen = Image.getInstance(png.toByteArray());
        imagen.scaleToFit(90, 90);
        return imagen;
    }

    private String urlEncode(String valor) {
        return valor.replace(" ", "%20");
    }

    // ─── Helpers de tabla ───────────────────────────────────────

    private void agregarEncabezadoDetalle(PdfPTable tabla, String texto) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, FUENTE_ETIQUETA));
        celda.setBackgroundColor(DORADO);
        celda.setPadding(4);
        celda.setHorizontalAlignment(Element.ALIGN_CENTER);
        tabla.addCell(celda);
    }

    private void agregarLineaDetalle(PdfPTable tabla, String cantidad, String descripcion,
                                      Double precioUnitario, double subtotal) {
        tabla.addCell(celdaSimple(cantidad, Element.ALIGN_CENTER));
        tabla.addCell(celdaSimple(descripcion, Element.ALIGN_LEFT));
        tabla.addCell(celdaSimple(
                String.format(Locale.US, "%.2f", precioUnitario == null ? 0.0 : precioUnitario),
                Element.ALIGN_RIGHT));
        tabla.addCell(celdaSimple(String.format(Locale.US, "%.2f", subtotal), Element.ALIGN_RIGHT));
    }

    private PdfPCell celdaSimple(String texto, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, FUENTE_NORMAL));
        celda.setPadding(4);
        celda.setHorizontalAlignment(alineacion);
        return celda;
    }

    private PdfPCell celdaEtiquetaValor(String etiqueta, String valor) {
        PdfPCell celda = new PdfPCell();
        celda.setPadding(4);
        celda.addElement(new Paragraph(etiqueta, FUENTE_ETIQUETA));
        celda.addElement(new Paragraph(valor, FUENTE_VALOR));
        return celda;
    }

    private Paragraph espacio(float alto) {
        Paragraph p = new Paragraph(Chunk.NEWLINE);
        p.setSpacingAfter(alto);
        return p;
    }

    private String valorOVacio(String valor) {
        return valor == null ? "" : valor;
    }

    private String valorODefault(String valor) {
        return valor == null || valor.isBlank() ? "—" : valor;
    }

    // ─── Marca de agua y pie de página en cada hoja ──────────────

    /**
     * Estampa, en cada página, la marca de agua diagonal semitransparente y el pie de página
     * aclarando que es un documento de un proyecto académico sin conexión real al SIN — mismo
     * criterio de honestidad que el resto de la Fase C: nunca se finge un documento fiscal real.
     */
    private static class MarcaDeAguaYPie extends PdfPageEventHelper {

        private static final com.lowagie.text.pdf.BaseFont FUENTE_BASE = crearFuenteBase();

        private static com.lowagie.text.pdf.BaseFont crearFuenteBase() {
            try {
                return com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                        com.lowagie.text.pdf.BaseFont.WINANSI, false);
            } catch (DocumentException | IOException e) {
                // HELVETICA_BOLD es una de las 14 fuentes estándar embebidas en el propio
                // OpenPDF: no debería fallar nunca en una JVM normal.
                throw new IllegalStateException("No se pudo cargar la fuente base del PDF", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte contenido = writer.getDirectContentUnder();

            contenido.saveState();
            PdfGState estadoTransparente = new PdfGState();
            estadoTransparente.setFillOpacity(0.12f);
            contenido.setGState(estadoTransparente);
            contenido.beginText();
            contenido.setFontAndSize(FUENTE_BASE, 46);
            contenido.setColorFill(DORADO);
            contenido.showTextAligned(Element.ALIGN_CENTER,
                    "DOCUMENTO DE PRUEBA — CIMIENTOS, SIN VALIDEZ FISCAL",
                    PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 35);
            contenido.endText();
            contenido.restoreState();

            PdfContentByte pie = writer.getDirectContent();
            pie.beginText();
            pie.setFontAndSize(FUENTE_BASE, 7);
            pie.setColorFill(GRIS_TEXTO);
            pie.showTextAligned(Element.ALIGN_CENTER,
                    "Documento generado por un proyecto académico (SistemaDesk / Fase C — "
                  + "cimientos de facturación electrónica SIAT). Sin conexión real al SIN. "
                  + "Sin validez fiscal.",
                    PageSize.A4.getWidth() / 2, 20, 0);
            pie.endText();
        }
    }
}
