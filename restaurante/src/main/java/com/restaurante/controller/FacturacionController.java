package com.restaurante.controller;

import com.restaurante.dto.request.ConfiguracionFacturacionRequest;
import com.restaurante.entity.ConfiguracionFacturacion;
import com.restaurante.entity.Factura;
import com.restaurante.exception.NegocioException;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.FacturacionService;
import com.restaurante.siat.ClienteSiat;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Facturación electrónica (SIAT) — cimientos.
 *
 * <p>El circuito local está completo: configuración, códigos de habilitación (simulados),
 * emisión con XML generado localmente, anulación, listados. Lo que falta es la conexión real
 * a los servicios web del SIN, aislada detrás de {@link ClienteSiat}. Una factura emitida acá
 * <b>nunca</b> queda ACEPTADA.
 */
@RestController
@RequestMapping("/facturacion")
@RequiredArgsConstructor
@Tag(name = "Facturación electrónica",
     description = "Cimientos: entidad, XML local y estado/configuración, sin conexión real al SIN.")
public class FacturacionController {

    private final FacturacionService facturacionService;
    private final SucursalAccessService sucursalAccessService;
    private final ClienteSiat clienteSiat;

    // ─── Estado y configuración ─────────────────────────────────

    @GetMapping("/estado/{sucursalId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Estado de la facturación electrónica en la sucursal")
    public ResponseEntity<Map<String, Object>> estado(@PathVariable Long sucursalId,
                                                        @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = resolver(user, sucursalId);
        ConfiguracionFacturacion config = facturacionService.obtenerConfiguracion(efectiva);

        return ResponseEntity.ok(Map.of(
                "sucursalId",  efectiva,
                "habilitada",  Boolean.TRUE.equals(config.getFacturacionHabilitada()),
                "conexionSin", clienteSiat.estaConfigurado(),
                "estado",      config.getEstadoHabilitacion(),
                "ambiente",    config.getAmbiente().name(),
                "cuisVigente", config.tieneCuisVigente(),
                "cufdVigente", config.tieneCufdVigente(),
                "mensaje",     "Cimientos de facturación electrónica: no hay conexión real al SIN."
        ));
    }

    @GetMapping("/configuracion/{sucursalId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    public ResponseEntity<ConfiguracionFacturacion> obtenerConfiguracion(
            @PathVariable Long sucursalId, @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(facturacionService.obtenerConfiguracion(resolver(user, sucursalId)));
    }

    @PutMapping("/configuracion/{sucursalId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Guardar los datos fiscales de la sucursal")
    public ResponseEntity<ConfiguracionFacturacion> guardarConfiguracion(
            @PathVariable Long sucursalId,
            @Valid @RequestBody ConfiguracionFacturacionRequest request,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(
                facturacionService.guardarConfiguracion(resolver(user, sucursalId), request));
    }

    // ─── Códigos del SIN (simulados) ─────────────────────────────

    @PostMapping("/cuis/{sucursalId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Generar un CUIS de prueba (no hay conexión real al SIN)")
    public ResponseEntity<ConfiguracionFacturacion> solicitarCuis(
            @PathVariable Long sucursalId, @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(facturacionService.solicitarCuis(resolver(user, sucursalId)));
    }

    @PostMapping("/cufd/{sucursalId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Renovar el CUFD de prueba, vigente 24 h (no hay conexión real al SIN)")
    public ResponseEntity<ConfiguracionFacturacion> renovarCufd(
            @PathVariable Long sucursalId, @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(facturacionService.renovarCufd(resolver(user, sucursalId)));
    }

    // ─── Facturas ───────────────────────────────────────────────

    @PostMapping("/emitir/{ventaId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Emitir la factura de una venta ya cobrada (queda PENDIENTE, XML generado localmente)")
    public ResponseEntity<Factura> emitir(@PathVariable Long ventaId,
                                           @Valid @RequestBody EmitirFacturaRequest request,
                                           @AuthenticationPrincipal UserDetailsImpl user) {
        Factura factura = facturacionService.emitir(
                ventaId, request.getNitCliente(), request.getTipoDocumento(),
                request.getRazonSocialCliente(), request.getComplemento(),
                request.getCorreoCliente(), user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(factura);
    }

    @GetMapping(value = "/{id}/xml", produces = MediaType.APPLICATION_XML_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Descargar el XML generado localmente de la factura")
    public ResponseEntity<String> descargarXml(@PathVariable Long id) {
        Factura factura = facturacionService.obtenerPorId(id);
        String xml = facturacionService.obtenerXml(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"factura-" + factura.getNumeroFactura() + ".xml\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(xml);
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Ver/descargar el PDF generado localmente de la factura (formato SIAT, sin validez fiscal)")
    public ResponseEntity<byte[]> descargarPdf(@PathVariable Long id) {
        Factura factura = facturacionService.obtenerPorId(id);
        byte[] pdf = facturacionService.obtenerPdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"factura-" + factura.getNumeroFactura() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PostMapping("/{id}/correo")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Enviar la factura por correo (no implementado: el proyecto no tiene un servicio de correo genérico)")
    public ResponseEntity<Void> enviarPorCorreo(@PathVariable Long id) {
        throw new NegocioException(
                "Funcionalidad no implementada — el envío de la factura por correo requiere un "
              + "servicio de correo (SMTP) que este proyecto todavía no tiene configurado. "
              + "Podés descargar el XML desde /facturacion/" + id + "/xml y enviarlo manualmente.");
    }

    @PostMapping("/{id}/reintentar")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Reintentar el envío al SIN (siempre falla: no hay conexión real configurada)")
    public ResponseEntity<Factura> reintentar(@PathVariable Long id) {
        return ResponseEntity.ok(facturacionService.reintentarEnvio(id));
    }

    @PostMapping("/{id}/anular")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Anular una factura localmente, con motivo")
    public ResponseEntity<Factura> anular(@PathVariable Long id,
                                           @Valid @RequestBody AnularFacturaRequest request,
                                           @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(facturacionService.anular(
                id, request.getMotivoCodigo(), request.getDetalle(), user.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Factura> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(facturacionService.obtenerPorId(id));
    }

    @GetMapping("/sucursal/{sucursalId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Listar facturas de la sucursal, opcionalmente por rango de fechas")
    public ResponseEntity<List<Factura>> listar(
            @PathVariable Long sucursalId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @AuthenticationPrincipal UserDetailsImpl user) {

        Long efectiva = resolver(user, sucursalId);
        return ResponseEntity.ok(desde != null && hasta != null
                ? facturacionService.listarPorRango(efectiva, desde, hasta)
                : facturacionService.listarPorSucursal(efectiva));
    }

    @GetMapping("/pendientes/{sucursalId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_FACTURACION')")
    @Operation(summary = "Facturas emitidas que siguen pendientes")
    public ResponseEntity<List<Factura>> pendientes(
            @PathVariable Long sucursalId, @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(facturacionService.listarPendientes(resolver(user, sucursalId)));
    }

    private Long resolver(UserDetailsImpl user, Long solicitada) {
        Long efectiva = sucursalAccessService.resolver(user, solicitada);
        if (efectiva == null) throw new NegocioException("No se pudo determinar la sucursal.");
        return efectiva;
    }

    // ─── Cuerpos de petición ────────────────────────────────────

    @Data
    public static class EmitirFacturaRequest {
        @NotBlank(message = "El NIT o documento del cliente es obligatorio (usá 0 si no lo da)")
        private String nitCliente;

        private Integer tipoDocumento;

        @NotBlank(message = "La razón social del cliente es obligatoria")
        private String razonSocialCliente;

        private String complemento;

        @Email(message = "El correo del cliente no tiene un formato válido")
        private String correoCliente;
    }

    @Data
    public static class AnularFacturaRequest {
        @NotNull(message = "El código del motivo de anulación es obligatorio")
        private Integer motivoCodigo;

        @NotBlank(message = "El detalle del motivo es obligatorio")
        private String detalle;
    }
}
