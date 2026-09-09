package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Stock físico de un insumo en una sucursal concreta. El catálogo (Insumo) es
 * único en todo el sistema; lo que varía por sucursal es cuánto hay y cuál es
 * el mínimo ahí.
 */
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "stock_insumo", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"insumo_id", "sucursal_id"}, name = "uk_stock_insumo_sucursal")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockInsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insumo_id", nullable = false)
    private Insumo insumo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @Column(nullable = false)
    @Builder.Default
    private Double stockActual = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double stockMinimo = 0.0;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;
}
