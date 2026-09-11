package com.restaurante.service.impl;

import com.restaurante.dto.request.ConfiguracionFacturacionRequest;
import com.restaurante.entity.*;
import com.restaurante.enums.EstadoFactura;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.*;
import com.restaurante.service.FacturacionService;
import com.restaurante.siat.ClienteSiat;
import com.restaurante.siat.FacturaPdfBuilder;
import com.restaurante.siat.FacturaXmlBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Circuito de facturación electrónica — cimientos.
 *
 * <p>Todo lo que puede hacerse sin el SIN está implementado de punta a punta: configuración,
 * códigos de habilitación (simulados), emisión con generación de XML local, anulación,
 * listados. Lo único que falta es la conversación real con el SIN, aislada detrás de
 * {@link ClienteSiat}. Esta clase nunca marca una factura como ACEPTADA.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FacturacionServiceImpl implements FacturacionService {

    private final FacturaRepository facturaRepository;
    private final ConfiguracionFacturacionRepository configuracionRepository;
    private final VentaRepository ventaRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaLogRepository auditoriaLogRepository;
    private final ClienteSiat clienteSiat;
    private final FacturaXmlBuilder xmlBuilder;
    private final FacturaPdfBuilder pdfBuilder;

    // ─── Configuración ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ConfiguracionFacturacion obtenerConfiguracion(Long sucursalId) {
        return configuracionRepository.findBySucursalId(sucursalId)
                .orElseGet(() -> porDefecto(buscarSucursal(sucursalId)));
    }

    @Override
    @Transactional
    public ConfiguracionFacturacion guardarConfiguracion(Long sucursalId,
                                                          ConfiguracionFacturacionRequest datos) {
        Sucursal sucursal = buscarSucursal(sucursalId);
        ConfiguracionFacturacion config = configuracionRepository.findBySucursalId(sucursalId)
                .orElseGet(() -> configuracionRepository.save(
                        ConfiguracionFacturacion.builder().sucursal(sucursal).build()));

        config.setNit(datos.getNit());
        config.setRazonSocial(datos.getRazonSocial());
        config.setMunicipio(datos.getMunicipio());
        config.setLeyendaFactura(datos.getLeyendaFactura());
        if (datos.getAmbiente() != null) config.setAmbiente(datos.getAmbiente());

        if (esTexto(datos.getCufdDireccion())) config.setCufdDireccion(datos.getCufdDireccion());
        if (esTexto(datos.getCuis())) {
            config.setCuis(datos.getCuis().trim());
            config.setCuisVigenteHasta(datos.getCuisVigenteHasta());
        }
        if (esTexto(datos.getCufd())) {
            config.setCufd(datos.getCufd().trim());
            config.setCufdCodigoControl(datos.getCufdCodigoControl());
            config.setCufdVigenteHasta(datos.getCufdVigenteHasta());
        }

        if (Boolean.TRUE.equals(datos.getFacturacionHabilitada()) && !config.tieneCufdVigente()) {
            throw new NegocioException(
                    "No se puede habilitar la facturación sin un CUFD vigente. Solicitá el CUIS "
                  + "y renová el CUFD (de prueba, mientras no haya conexión real al SIN) desde "
                  + "esta misma pantalla.");
        }
        if (datos.getFacturacionHabilitada() != null) {
            config.setFacturacionHabilitada(datos.getFacturacionHabilitada());
        }

        return configuracionRepository.save(config);
    }

    // ─── Códigos del SIN (simulados) ──────────────────────────────

    @Override
    @Transactional
    public ConfiguracionFacturacion solicitarCuis(Long sucursalId) {
        ConfiguracionFacturacion config = configuracionExistente(sucursalId);

        config.setCuis("CUIS-DEMO-" + codigoCorto());
        config.setCuisVigenteHasta(LocalDateTime.now().plusMonths(6));
        log.info("[SIAT-DEMO] CUIS simulado generado para la sucursal {} (sin conexión real al SIN).",
                sucursalId);

        return configuracionRepository.save(config);
    }

    @Override
    @Transactional
    public ConfiguracionFacturacion renovarCufd(Long sucursalId) {
        ConfiguracionFacturacion config = configuracionExistente(sucursalId);

        if (!config.tieneCuisVigente()) {
            throw new NegocioException(
                    "No se puede pedir el CUFD sin un CUIS vigente. Solicitá primero el CUIS.");
        }

        config.setCufd("CUFD-DEMO-" + codigoCorto());
        config.setCufdCodigoControl("CTRL-" + codigoCorto());
        if (!esTexto(config.getCufdDireccion())) {
            config.setCufdDireccion(
                    config.getSucursal() != null ? config.getSucursal().getNombre() : "Sin dirección");
        }
        config.setCufdVigenteHasta(LocalDateTime.now().plusHours(24));
        log.info("[SIAT-DEMO] CUFD simulado generado para la sucursal {}, vigente hasta {} "
                + "(sin conexión real al SIN).", sucursalId, config.getCufdVigenteHasta());

        return configuracionRepository.save(config);
    }

    // ─── Emisión ────────────────────────────────────────────────

    @Override
    @Transactional
    public Factura emitir(Long ventaId, String nitCliente, Integer tipoDocumento,
                          String razonSocialCliente, String complemento, String correoCliente,
                          Long usuarioId) {

        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Venta", ventaId));

        if (Boolean.TRUE.equals(venta.getAnulada())) {
            throw new NegocioException("No se puede facturar una venta anulada.");
        }
        facturaRepository.findByVentaId(ventaId).ifPresent(f -> {
            throw new NegocioException("La venta #" + ventaId + " ya tiene la factura "
                    + f.getNumeroFactura() + ".");
        });
        if (razonSocialCliente == null || razonSocialCliente.isBlank()) {
            throw new NegocioException("La razón social del cliente es obligatoria.");
        }

        Long sucursalId = venta.getSucursal() != null ? venta.getSucursal().getId() : null;
        if (sucursalId == null) throw new NegocioException("La venta no tiene sucursal asignada.");

        ConfiguracionFacturacion config = configuracionRepository
                .findBySucursalIdParaActualizar(sucursalId)
                .orElseThrow(() -> new NegocioException(
                        "La sucursal no tiene configurada la facturación electrónica."));

        if (!Boolean.TRUE.equals(config.getFacturacionHabilitada())) {
            throw new NegocioException("La facturación electrónica está deshabilitada en esta sucursal.");
        }
        if (!config.tieneCufdVigente()) {
            throw new NegocioException(
                    "El CUFD está vencido o no existe. Renovalo (de prueba) antes de facturar.");
        }

        long numero = config.getNumeroFacturaActual() + 1;
        LocalDateTime ahora = LocalDateTime.now();

        Factura factura = Factura.builder()
                .venta(venta)
                .sucursal(venta.getSucursal())
                .cuf("CUF-DEMO-" + codigoCorto())
                .numeroFactura(numero)
                .fechaEmision(ahora)
                .nitCliente(nitCliente == null || nitCliente.isBlank() ? "0" : nitCliente.trim())
                .tipoDocumento(tipoDocumento)
                .razonSocialCliente(razonSocialCliente.trim())
                .complemento(complemento)
                .correoCliente(correoCliente == null || correoCliente.isBlank()
                        ? null : correoCliente.trim())
                .montoTotal(venta.getTotalCobrado())
                // Nunca ACEPTADA: no hay conexión real al SIN que la valide.
                .estado(EstadoFactura.PENDIENTE)
                .build();

        // El XML se genera SIEMPRE: es el documento en sí, no un mensaje de red.
        factura.setXmlGenerado(xmlBuilder.construir(factura, config, venta));

        config.setNumeroFacturaActual(numero);
        configuracionRepository.save(config);
        facturaRepository.save(factura);

        registrarAuditoria("EMISION_FACTURA", factura, usuarioId,
                "Factura " + numero + " (cimientos, sin envío real al SIN)");

        return factura;
    }

    @Override
    @Transactional(readOnly = true)
    public String obtenerXml(Long facturaId) {
        Factura factura = obtenerPorId(facturaId);
        if (factura.getXmlGenerado() == null || factura.getXmlGenerado().isBlank()) {
            throw new NegocioException("La factura no tiene XML generado.");
        }
        return factura.getXmlGenerado();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] obtenerPdf(Long facturaId) {
        Factura factura = obtenerPorId(facturaId);
        Long sucursalId = factura.getSucursal() != null ? factura.getSucursal().getId() : null;

        ConfiguracionFacturacion config = sucursalId == null
                ? ConfiguracionFacturacion.builder().build()
                : configuracionRepository.findBySucursalId(sucursalId)
                        .orElseGet(() -> porDefecto(factura.getSucursal()));

        return pdfBuilder.generarPdf(factura, config);
    }

    @Override
    @Transactional
    public Factura reintentarEnvio(Long facturaId) {
        Factura factura = obtenerPorId(facturaId);

        if (!factura.puedeReintentarse()) {
            throw new NegocioException("La factura está en estado " + factura.getEstado()
                    + " y no se puede reenviar.");
        }
        // Nunca hay conexión real: esto siempre lanza NegocioException con un mensaje claro.
        clienteSiat.enviarFactura(factura);
        return factura;
    }

    @Override
    @Transactional
    public Factura anular(Long facturaId, Integer motivoCodigo, String detalle, Long usuarioId) {
        Factura factura = obtenerPorId(facturaId);

        if (factura.getEstado() == EstadoFactura.ANULADA) {
            throw new NegocioException("La factura ya está anulada.");
        }
        if (detalle == null || detalle.isBlank()) {
            throw new NegocioException("El motivo de la anulación es obligatorio.");
        }
        if (motivoCodigo == null) {
            throw new NegocioException("El código del motivo de anulación es obligatorio.");
        }

        factura.setEstado(EstadoFactura.ANULADA);
        factura.setMotivoAnulacionCodigo(motivoCodigo);
        factura.setMotivoAnulacionDetalle(detalle.trim());
        factura.setAnuladaEn(LocalDateTime.now());
        usuarioRepository.findById(usuarioId).ifPresent(factura::setUsuarioAnulacion);

        registrarAuditoria("ANULACION_FACTURA", factura, usuarioId, detalle.trim());
        return facturaRepository.save(factura);
    }

    // ─── Consultas ──────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Factura obtenerPorId(Long id) {
        return facturaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Factura", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Factura> listarPorSucursal(Long sucursalId) {
        return facturaRepository.findBySucursalIdOrderByFechaEmisionDesc(sucursalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Factura> listarPorRango(Long sucursalId, LocalDateTime desde, LocalDateTime hasta) {
        return facturaRepository.findPorRango(sucursalId, desde, hasta);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Factura> listarPendientes(Long sucursalId) {
        return facturaRepository.findBySucursalIdAndEstadoOrderByFechaEmisionDesc(
                sucursalId, EstadoFactura.PENDIENTE);
    }

    // ─── Interno ────────────────────────────────────────────────

    private ConfiguracionFacturacion configuracionExistente(Long sucursalId) {
        return configuracionRepository.findBySucursalId(sucursalId)
                .orElseThrow(() -> new NegocioException(
                        "La sucursal no tiene configurada la facturación electrónica. "
                      + "Guardá primero los datos fiscales (NIT, razón social)."));
    }

    private ConfiguracionFacturacion porDefecto(Sucursal sucursal) {
        return ConfiguracionFacturacion.builder()
                .sucursal(sucursal)
                .razonSocial(sucursal.getNombre())
                .build();
    }

    private boolean esTexto(String valor) {
        return valor != null && !valor.isBlank();
    }

    private Sucursal buscarSucursal(Long sucursalId) {
        return sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", sucursalId));
    }

    private String codigoCorto() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private void registrarAuditoria(String accion, Factura factura, Long usuarioId, String detalle) {
        String username = usuarioId == null ? "sistema" : usuarioRepository.findById(usuarioId)
                .map(Usuario::getUsername).orElse("sistema");

        auditoriaLogRepository.save(AuditoriaLog.builder()
                .entidad("Factura")
                .entidadId(factura.getId())
                .accion(accion)
                .valorNuevo(detalle)
                .username(username)
                .sucursal(factura.getSucursal())
                .build());
    }
}
