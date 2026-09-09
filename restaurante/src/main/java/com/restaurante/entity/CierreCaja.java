package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoCierreCaja;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Turno de caja: abre con un monto inicial de efectivo, acumula las ventas
 * del cajero durante el turno y al cerrar compara el efectivo declarado
 * contra el esperado (monto inicial + ventas en efectivo del turno).
 */
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "cierres_caja")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CierreCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cajero_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})
    private Usuario cajero;

    @Column(nullable = false)
    private LocalDateTime fechaApertura;

    private LocalDateTime fechaCierre;

    @Column(nullable = false)
    private Double montoInicial;

    private Double montoFinalDeclarado;

    @Column(nullable = false)
    @Builder.Default
    private Double totalVentasEfectivo = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double totalVentasQr = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double totalVentasMixto = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double totalVentasCredito = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double totalVentasGeneral = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Integer cantidadVentas = 0;

    @Column(nullable = false)
    @Builder.Default
    private Double totalIngresos = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double totalRetiros = 0.0;

    private Double montoEsperadoEfectivo;

    private Double diferencia;

    @Column(length = 255)
    private String observaciones;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoCierreCaja estado = EstadoCierreCaja.ABIERTO;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;
}
