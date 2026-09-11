package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.AmbienteFacturacion;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Datos de facturación electrónica de una sucursal ante el SIN (SIAT), una fila por sucursal.
 *
 * <p><b>Estado: cimientos.</b> Guarda los datos fiscales y los códigos de habilitación
 * (CUIS/CUFD), pero no hay conexión real a los servicios web del SIN — ese trabajo requiere
 * el token del contribuyente y el certificado digital de una empresa boliviana registrada,
 * que este proyecto académico no tiene. Ver {@link com.restaurante.siat.ClienteSiat}.
 *
 * <h3>Los dos códigos que importan acá</h3>
 * <ul>
 *   <li><b>CUIS</b> — Código Único de Inicio de Sistemas. Se pide una vez y dura meses.</li>
 *   <li><b>CUFD</b> — Código Único de Facturación Diaria. Vence cada 24 horas.</li>
 * </ul>
 * En este sistema ambos se generan localmente con un valor de prueba (nunca se obtienen
 * realmente del SIN), y quedan claramente marcados como "DEMO" en su propio valor.
 */
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "configuracion_facturacion", uniqueConstraints = {
        @UniqueConstraint(columnNames = "sucursal_id", name = "uk_config_facturacion_sucursal")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConfiguracionFacturacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    // ── Identificación del contribuyente ──────────────────────────

    @Column(length = 20)
    private String nit;

    @Column(length = 200)
    private String razonSocial;

    /** Municipio del punto de venta, tal como lo pide el SIN (nombre, no la dirección). */
    @Column(length = 100)
    private String municipio;

    /** Leyenda que el SIN exige imprimir en la factura, según la actividad económica. */
    @Column(length = 500)
    private String leyendaFactura;

    // ── Parámetros del circuito ───────────────────────────────────

    /** PRUEBAS mientras no hay conexión real; pasar a PRODUCCION tiene que ser deliberado. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AmbienteFacturacion ambiente = AmbienteFacturacion.PRUEBAS;

    /**
     * Interruptor general. Mientras esté apagado, el sistema vende e imprime tickets
     * normalmente y no ofrece emitir facturas. Es el estado en el que se entrega el sistema.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean facturacionHabilitada = false;

    // ── Códigos de habilitación del SIN (simulados en este proyecto) ──

    @Column(length = 100)
    private String cuis;

    private LocalDateTime cuisVigenteHasta;

    @Column(length = 100)
    private String cufd;

    @Column(length = 100)
    private String cufdCodigoControl;

    @Column(length = 250)
    private String cufdDireccion;

    private LocalDateTime cufdVigenteHasta;

    // ── Numeración ────────────────────────────────────────────────

    /** Última factura emitida en esta sucursal (independiente del correlativo del ticket). */
    @Column(nullable = false)
    @Builder.Default
    private Long numeroFacturaActual = 0L;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    // ── Ayudas de lectura ─────────────────────────────────────────

    @Transient
    public boolean tieneCufdVigente() {
        return cufd != null && !cufd.isBlank()
                && cufdVigenteHasta != null
                && cufdVigenteHasta.isAfter(LocalDateTime.now());
    }

    @Transient
    public boolean tieneCuisVigente() {
        return cuis != null && !cuis.isBlank()
                && cuisVigenteHasta != null
                && cuisVigenteHasta.isAfter(LocalDateTime.now());
    }

    /** Qué falta para poder facturar, sin exponer los códigos completos. */
    @Transient
    public String getEstadoHabilitacion() {
        if (!Boolean.TRUE.equals(facturacionHabilitada)) return "DESHABILITADA";
        if (nit == null || nit.isBlank())                return "FALTA_NIT";
        if (!tieneCuisVigente())                         return "FALTA_CUIS";
        if (!tieneCufdVigente())                         return "CUFD_VENCIDO";
        return "LISTA";
    }
}
