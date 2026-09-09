package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.TipoMovimientoInventario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Registro inmutable de cada movimiento de inventario (ingreso, consumo, merma, etc.) */
@Entity
@Table(name = "movimientos_inventario")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insumo_id", nullable = false)
    @JsonIgnore
    private Insumo insumo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lote_id")
    @JsonIgnore
    private LoteInsumo lote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimientoInventario tipo;

    @Column(nullable = false)
    private Double cantidad;

    /** Stock antes del movimiento */
    private Double stockAnterior;

    /** Stock después del movimiento */
    private Double stockPosterior;

    @Column(length = 255)
    private String motivo;

    /** Detalle adicional (usado en mermas: notas extra sobre la causa) */
    @Column(length = 500)
    private String observaciones;

    /** Valor económico del movimiento en el momento del registro (Bs) */
    private Double valorEconomico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    @JsonIgnore
    private Usuario usuario;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
