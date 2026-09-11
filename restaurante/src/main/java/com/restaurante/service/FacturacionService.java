package com.restaurante.service;

import com.restaurante.dto.request.ConfiguracionFacturacionRequest;
import com.restaurante.entity.ConfiguracionFacturacion;
import com.restaurante.entity.Factura;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Facturación electrónica ante el SIN — cimientos.
 *
 * <p>Este servicio genera el XML localmente, gestiona configuración y códigos de habilitación
 * (simulados), y deja las facturas en estado {@code PENDIENTE}. No hay conexión real al SIN:
 * ver {@link com.restaurante.siat.ClienteSiat}. Facturar nunca puede bloquear una venta: la
 * venta y el ticket ya existen antes de intentar emitir una factura sobre ella.
 */
public interface FacturacionService {

    /** Configuración fiscal de la sucursal; si no existe, una por defecto sin persistir. */
    ConfiguracionFacturacion obtenerConfiguracion(Long sucursalId);

    ConfiguracionFacturacion guardarConfiguracion(Long sucursalId, ConfiguracionFacturacionRequest datos);

    /** Genera un CUIS de prueba local ("CUIS-DEMO-...") y lo guarda. No es un CUIS real. */
    ConfiguracionFacturacion solicitarCuis(Long sucursalId);

    /** Genera un CUFD de prueba local, vigente 24 h. No es un CUFD real. */
    ConfiguracionFacturacion renovarCufd(Long sucursalId);

    /** Emite la factura de una venta ya cobrada. Genera el XML local y queda PENDIENTE. */
    Factura emitir(Long ventaId, String nitCliente, Integer tipoDocumento,
                    String razonSocialCliente, String complemento, String correoCliente,
                    Long usuarioId);

    /** XML de la factura, tal como se guardó al emitirla. */
    String obtenerXml(Long facturaId);

    /**
     * PDF de la factura, generado bajo demanda (no se persiste) con
     * {@link com.restaurante.siat.FacturaPdfBuilder}: formato visual del estándar boliviano,
     * con QR y marca de agua "DOCUMENTO DE PRUEBA" dejando claro que no tiene validez fiscal.
     */
    byte[] obtenerPdf(Long facturaId);

    /** Siempre falla: no hay conexión real al SIN. Ver {@link com.restaurante.siat.ClienteSiat}. */
    Factura reintentarEnvio(Long facturaId);

    /** Anula una factura localmente, con motivo obligatorio. */
    Factura anular(Long facturaId, Integer motivoCodigo, String detalle, Long usuarioId);

    Factura obtenerPorId(Long id);

    List<Factura> listarPorSucursal(Long sucursalId);

    List<Factura> listarPorRango(Long sucursalId, LocalDateTime desde, LocalDateTime hasta);

    /** Facturas emitidas que siguen pendientes (todas, mientras no haya conexión real). */
    List<Factura> listarPendientes(Long sucursalId);
}
