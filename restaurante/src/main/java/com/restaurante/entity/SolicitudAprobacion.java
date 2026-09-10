package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoSolicitud;
import com.restaurante.enums.TipoSolicitud;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Solicitud de un usuario sin permiso de ejecución directa (CAJERO/VENDEDOR/GERENTE_SUCURSAL)
 * para anular una venta o revertir un movimiento de caja. Un ADMIN la aprueba (lo que ejecuta
 * la acción real vía VentaService/CierreCajaService) o la rechaza (sin efecto).
 */
@Entity
@Table(name = "solicitudes_aprobacion")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SolicitudAprobacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoSolicitud tipo;

    /** Id de la Venta o del MovimientoCaja sobre el que se pide la acción, según `tipo`. */
    @Column(nullable = false)
    private Long entidadId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @Column(nullable = false, length = 255)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitante_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})
    private Usuario solicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resuelto_por_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})
    private Usuario resueltoPor;

    @Column(length = 255)
    private String motivoRechazo;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    private LocalDateTime resueltoEn;
}
