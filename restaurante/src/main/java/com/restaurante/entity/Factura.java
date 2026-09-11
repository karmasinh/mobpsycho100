package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoFactura;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Factura electrónica emitida ante el SIN por una venta.
 *
 * <h3>Por qué es una entidad aparte de {@link Venta}</h3>
 * En Bolivia no toda venta lleva factura: muchos clientes de mostrador no la piden. La venta
 * es el registro interno del cobro; la factura es el documento fiscal, opcional, que se emite
 * solo cuando el cliente da su NIT o su carnet.
 *
 * <h3>Nunca llega a ACEPTADA</h3>
 * Como no hay conexión real a los servicios web del SIN, el {@link #estado} de una factura
 * emitida por este sistema queda siempre en {@link EstadoFactura#PENDIENTE}: el {@link #xml}
 * se genera igual (es el documento en sí, no un mensaje de red) y queda disponible para
 * descargar, pero jamás se marca como aceptada — eso sería falsificar el estado.
 *
 * <h3>Una factura no se borra</h3>
 * Se anula, con motivo, y el registro queda para siempre porque es un documento fiscal.
 */
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "facturas", uniqueConstraints = {
        @UniqueConstraint(columnNames = "venta_id", name = "uk_factura_venta")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Factura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** La venta que factura. Una venta tiene como máximo una factura. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "pedido"})
    private Venta venta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    /**
     * Código de factura generado localmente a modo de identificador único, con el prefijo
     * "CUF-DEMO-" bien visible. <b>No es un CUF real</b>: el cálculo del CUF real del SIN
     * exige el NIT, el CUFD del día y un algoritmo publicado por el SIN que requiere
     * validarse contra el ambiente PILOTO — fuera del alcance de estos cimientos.
     */
    @Column(length = 100, unique = true)
    private String cuf;

    /** Correlativo de factura de la sucursal. */
    @Column(nullable = false)
    private Long numeroFactura;

    @Column(nullable = false)
    private LocalDateTime fechaEmision;

    // ── Datos del comprador ───────────────────────────────────────

    /** NIT o número de documento del cliente. "0" para ventas sin nombre. */
    @Column(length = 20)
    private String nitCliente;

    /** Código del tipo de documento según el catálogo del SIN (1=CI, 5=NIT, etc). */
    private Integer tipoDocumento;

    @Column(length = 200)
    private String razonSocialCliente;

    /** Complemento del documento de identidad, cuando corresponde. */
    @Column(length = 10)
    private String complemento;

    /** Correo al que se le mandaría la factura. Opcional: no todos lo dan. */
    @Column(length = 150)
    private String correoCliente;

    @Column(nullable = false)
    private Double montoTotal;

    // ── Estado ante el SIN ────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoFactura estado = EstadoFactura.PENDIENTE;

    /**
     * XML de la factura. Se genera siempre al emitir, haya o no conexión con el SIN: es el
     * documento en sí, no un mensaje de red. Se guarda para poder descargarlo y, cuando en el
     * futuro se conecte el SIN de verdad, enviar exactamente este mismo XML.
     */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String xmlGenerado;

    // ── Anulación ─────────────────────────────────────────────────

    /** Código del motivo de anulación según el catálogo del SIN. */
    private Integer motivoAnulacionCodigo;

    @Column(length = 300)
    private String motivoAnulacionDetalle;

    private LocalDateTime anuladaEn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_anulacion_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Usuario usuarioAnulacion;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    /** Una factura ya anulada o rechazada no se puede volver a "reintentar". */
    @Transient
    public boolean puedeReintentarse() {
        return estado == EstadoFactura.PENDIENTE || estado == EstadoFactura.RECHAZADA;
    }
}
