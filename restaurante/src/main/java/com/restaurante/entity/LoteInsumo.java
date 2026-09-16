package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lote de insumo ingresado por compra. Soporta FEFO (First Expired, First Out).
 * El sistema consume primero los lotes con fecha de vencimiento más próxima.
 */
@Entity
@Table(name = "lotes_insumo", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"numero_lote", "insumo_id", "proveedor_id"}, name = "uk_lote_insumo_proveedor")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoteInsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_lote", nullable = false, length = 50)
    private String numeroLote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insumo_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "lotes", "movimientos"})
    private Insumo insumo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Proveedor proveedor;

    @Column(nullable = false)
    private Double cantidadInicial;

    @Column(nullable = false)
    private Double cantidadDisponible;

    @Column(nullable = false)
    private Double precioUnitario;

    private LocalDate fechaVencimiento;

    private LocalDate fechaIngreso;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    /**
     * Eliminación lógica del lote (p. ej. cargado por error). Distinto de
     * {@code activo}, que es derivado y significa "todavía tiene cantidad
     * disponible" — este campo es una decisión explícita del usuario y se
     * mantiene aunque el lote conserve cantidad, para no perder su historial
     * de movimientos asociado.
     */
    @Column(nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private Boolean eliminado = false;

    /** Días hasta vencimiento (calculado por el scheduler de alertas) */
    @Transient
    public long getDiasHastaVencimiento() {
        if (fechaVencimiento == null) return Long.MAX_VALUE;
        return LocalDate.now().until(fechaVencimiento).getDays();
    }

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
