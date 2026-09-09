package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "insumos", uniqueConstraints = {
        @UniqueConstraint(columnNames = "codigo", name = "uk_insumo_codigo"),
        @UniqueConstraint(columnNames = {"nombre", "unidad_medida"}, name = "uk_insumo_nombre_unidad")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Insumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(name = "unidad_medida", nullable = false, length = 30)
    private String unidadMedida;

    /** Precio unitario global (promedio ponderado, se actualiza en cada compra en cualquier sucursal) */
    @Column(nullable = false)
    @Builder.Default
    private Double precioUnitario = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean perecedero = false;

    @ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "categoria_id")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
private CategoriaInsumo categoria;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @OneToMany(mappedBy = "insumo", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<LoteInsumo> lotes = new ArrayList<>();

    @OneToMany(mappedBy = "insumo", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<MovimientoInventario> movimientos = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;
}
