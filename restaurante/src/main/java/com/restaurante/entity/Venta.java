package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.FormaPago;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "ventas", uniqueConstraints = {
        @UniqueConstraint(columnNames = "pedido_id", name = "uk_venta_pedido")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "venta"})
    private Pedido pedido;

    /** Denormalizado desde pedido.sucursal para poder filtrar/reportar sin joins */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @Column(nullable = false)
    private Double totalCobrado;

    @Column(nullable = false)
    private Double montoRecibido;

    @Column(nullable = false)
    @Builder.Default
    private Double vuelto = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormaPago formaPago;

    @Column(nullable = false)
    @Builder.Default
    private Boolean anulada = false;

    @Column(length = 255)
    private String motivoAnulacion;

    /** Número de comprobante impreso para el cliente, ej. "S1-000042" — correlativo por sucursal. */
    @Column(length = 20)
    private String numeroTicket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_cajero_id")
    private Usuario cajero;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_anulacion_id")
    private Usuario usuarioAnulacion;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    private LocalDateTime anuladaEn;
}
