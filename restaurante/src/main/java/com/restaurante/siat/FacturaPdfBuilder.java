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
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.restaurante.entity.ConfiguracionFacturacion;
import com.restaurante.entity.DetallePedido;
import com.restaurante.entity.Factura;
import com.restaurante.entity.Venta;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.awt.geom.AffineTransform;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
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

    /** Fuente serif en negrita para la "E" del emblema vectorial por defecto (ver
     *  {@link #emblemaPorDefecto}), replicando la tipografía Georgia/Times del SVG original. */
    private static final com.lowagie.text.pdf.BaseFont FUENTE_EMBLEMA_E = crearFuenteEmblema();

    private static com.lowagie.text.pdf.BaseFont crearFuenteEmblema() {
        try {
            return com.lowagie.text.pdf.BaseFont.createFont(
                    com.lowagie.text.pdf.BaseFont.TIMES_BOLD,
                    com.lowagie.text.pdf.BaseFont.WINANSI, false);
        } catch (DocumentException | IOException e) {
            // TIMES_BOLD es una de las 14 fuentes estándar embebidas en el propio OpenPDF:
            // no debería fallar nunca en una JVM normal.
            throw new IllegalStateException("No se pudo cargar la fuente del emblema por defecto", e);
        }
    }

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

            agregarEncabezado(documento, factura, config, writer);
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

    private void agregarEncabezado(Document doc, Factura f, ConfiguracionFacturacion c, PdfWriter writer)
            throws DocumentException {
        // Logo: el que subió la sucursal si existe (base64/data URL), o si no el emblema
        // vectorial por defecto de "La Entrerriana" (mismo diseño que login.component.ts),
        // dibujado con primitivas de PdfContentByte — nunca queda un espacio vacío.
        PdfPTable cabecera = new PdfPTable(2);
        cabecera.setWidthPercentage(100);
        cabecera.setWidths(new float[]{2f, 1f});

        PdfPCell celdaLogo = new PdfPCell();
        celdaLogo.setBorder(Rectangle.NO_BORDER);
        celdaLogo.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Image logo = null;
        if (esTexto(c.getLogoBase64())) {
            try {
                logo = Image.getInstance(decodificarBase64(c.getLogoBase64()));
            } catch (Exception e) {
                // Logo subido corrupto/no decodificable: se sigue con el emblema por defecto
                // en vez de interrumpir la generación de la factura.
                logo = null;
            }
        }
        if (logo == null) {
            logo = emblemaPorDefecto(writer.getDirectContent(), 50f);
        }
        logo.scaleToFit(55, 55);
        celdaLogo.addElement(logo);
        celdaLogo.addElement(espacio(2));
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

    private boolean esTexto(String valor) {
        return valor != null && !valor.isBlank();
    }

    /** El frontend guarda el logo como data URL completa ({@code data:image/png;base64,...}). */
    private byte[] decodificarBase64(String valor) {
        String base64 = valor.contains(",") ? valor.substring(valor.indexOf(',') + 1) : valor;
        return Base64.getDecoder().decode(base64.trim());
    }

    // ─── Emblema vectorial por defecto ────────────────────────────

    /**
     * Dibuja el emblema vectorial de "La Entrerriana" — el mismo diseño que
     * {@code login.component.ts} (líneas 72-88 del frontend Ventas): dos círculos
     * concéntricos, tres elipses arriba (motivo tipo espiga), una línea corta y la letra
     * "E" centrada. Se dibuja con primitivas de {@link PdfContentByte} sobre un
     * {@link PdfTemplate} (un XObject vectorial embebido en el PDF), no como una imagen
     * rasterizada, y se usa cuando la sucursal no subió su propio logo.
     *
     * <p>El {@code viewBox} del SVG original es 80x80; acá se escala a {@code tamano}
     * puntos manteniendo las proporciones. El eje Y se invierte coordenada por coordenada
     * (el SVG crece hacia abajo, el PDF hacia arriba), así que las dos elipses rotadas del
     * SVG (±18°) se dibujan con el ángulo invertido para que la inclinación se vea igual
     * tras el volteo del eje.
     */
    private Image emblemaPorDefecto(PdfContentByte contenidoDirecto, float tamano) throws DocumentException {
        PdfTemplate t = contenidoDirecto.createTemplate(tamano, tamano);
        float escala = tamano / 80f;

        // Círculo exterior
        t.setColorStroke(DORADO);
        t.setLineWidth(2f * escala);
        t.circle(px(40, escala), py(40, escala, tamano), 36 * escala);
        t.stroke();

        // Círculo interior, semitransparente
        t.saveState();
        PdfGState gCirculoInterior = new PdfGState();
        gCirculoInterior.setStrokeOpacity(0.4f);
        t.setGState(gCirculoInterior);
        t.setLineWidth(0.75f * escala);
        t.circle(px(40, escala), py(40, escala, tamano), 28 * escala);
        t.stroke();
        t.restoreState();

        // Motivo superior: elipse central + dos elipses laterales inclinadas
        dibujarElipseEmblema(t, escala, tamano, 40, 9, 2.5f, 5f, 0f, 0.85f);
        dibujarElipseEmblema(t, escala, tamano, 33, 11, 2.5f, 4.5f, 18f, 0.7f);
        dibujarElipseEmblema(t, escala, tamano, 47, 11, 2.5f, 4.5f, -18f, 0.7f);

        // Línea corta debajo del motivo
        t.setColorStroke(DORADO);
        t.setLineCap(PdfContentByte.LINE_CAP_ROUND);
        t.setLineWidth(1.5f * escala);
        t.moveTo(px(40, escala), py(14, escala, tamano));
        t.lineTo(px(40, escala), py(22, escala, tamano));
        t.stroke();

        // Letra "E" centrada
        t.beginText();
        t.setFontAndSize(FUENTE_EMBLEMA_E, 32f * escala);
        t.setColorFill(DORADO);
        t.showTextAligned(Element.ALIGN_CENTER, "E", px(40, escala), py(58, escala, tamano), 0);
        t.endText();

        return Image.getInstance(t);
    }

    /** Dibuja una de las tres elipses del motivo superior del emblema, con su inclinación
     *  y opacidad propias, aplicando la rotación alrededor de su propio centro. */
    private void dibujarElipseEmblema(PdfTemplate t, float escala, float tamano,
                                       float cx, float cy, float rx, float ry,
                                       float anguloGrados, float opacidad) {
        t.saveState();
        if (anguloGrados != 0f) {
            float cxP = px(cx, escala);
            float cyP = py(cy, escala, tamano);
            t.transform(AffineTransform.getRotateInstance(Math.toRadians(anguloGrados), cxP, cyP));
        }
        PdfGState gElipse = new PdfGState();
        gElipse.setFillOpacity(opacidad);
        t.setGState(gElipse);
        t.setColorFill(DORADO);
        float x1 = px(cx - rx, escala);
        float x2 = px(cx + rx, escala);
        float y1 = py(cy - ry, escala, tamano);
        float y2 = py(cy + ry, escala, tamano);
        t.ellipse(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
        t.fill();
        t.restoreState();
    }

    /** Convierte una coordenada X del viewBox SVG (80x80) a puntos del template PDF. */
    private float px(float svgX, float escala) {
        return svgX * escala;
    }

    /** Convierte una coordenada Y del viewBox SVG (80x80, crece hacia abajo) a puntos del
     *  template PDF (crece hacia arriba). */
    private float py(float svgY, float escala, float tamano) {
        return tamano - svgY * escala;
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
