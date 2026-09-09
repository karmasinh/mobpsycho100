package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "receta_ingredientes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecetaIngrediente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receta_id", nullable = false)
    @JsonIgnore
    private Receta receta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insumo_id", nullable = false)
    @JsonIgnore
    private Insumo insumo;

    @Column(nullable = false)
    private Double cantidad;

    @Column(nullable = false, length = 30)
    private String unidadMedida;

    /** Costo del ingrediente calculado = cantidad * precio_unitario_insumo */
    @Column(nullable = false)
    @Builder.Default
    private Double costoIngrediente = 0.0;
}
