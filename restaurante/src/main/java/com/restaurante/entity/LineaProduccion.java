package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.TipoLineaProduccion;
import jakarta.persistence.*;
import lombok.*;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "linea_produccion")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LineaProduccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produccion_id", nullable = false)
    @JsonIgnore
    private ProduccionDia produccion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plato_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "recetas", "categorias"})
    private Plato plato;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoLineaProduccion tipo;

    @Column(name = "cantidad_planificada", nullable = false)
    @Builder.Default
    private Integer cantidadPlanificada = 0;

    @Column(name = "cantidad_producida", nullable = false)
    @Builder.Default
    private Integer cantidadProducida = 0;

    @Column(name = "cantidad_vendida", nullable = false)
    @Builder.Default
    private Integer cantidadVendida = 0;

    @Transient
    public int getCantidadDisponible() {
        return Math.max(0, cantidadProducida - cantidadVendida);
    }
}
