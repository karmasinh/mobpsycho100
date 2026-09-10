package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.TipoMovimientoCaja;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Ingreso o retiro de efectivo dentro de un turno de caja, fuera de una venta */
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "movimientos_caja")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MovimientoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cierre_caja_id", nullable = false)
    @JsonIgnore
    private CierreCaja cierreCaja;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimientoCaja tipo;

    @Column(nullable = false)
    private Double monto;

    @Column(length = 255)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})
    private Usuario usuario;

    /** Si este movimiento es la reversión de otro, apunta al id del movimiento original. */
    @Column(name = "revierte_id")
    private Long revierteId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
