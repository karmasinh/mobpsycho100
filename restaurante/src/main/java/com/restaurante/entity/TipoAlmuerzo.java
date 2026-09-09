package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tipos_almuerzo", uniqueConstraints = {
        @UniqueConstraint(columnNames = "nombre", name = "uk_tipo_almuerzo_nombre")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TipoAlmuerzo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(nullable = false)
    private Double precioMensual;

    @Column(length = 255)
    private String descripcion;

    /** Días de la semana disponibles, ej: "LUNES,MARTES,MIERCOLES,JUEVES,VIERNES" */
    @Column(length = 100)
    private String diasDisponibles;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receta_base_id")
    @JsonIgnore
    private Receta recetaBase;

    public Long getRecetaBaseId() {
        return recetaBase != null ? recetaBase.getId() : null;
    }

    @OneToMany(mappedBy = "tipoAlmuerzo", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<Pensionado> pensionados = new ArrayList<>();
}
