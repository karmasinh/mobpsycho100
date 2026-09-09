package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categorias_plato", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"nombre", "sucursal_id"}, name = "uk_cat_plato_nombre_sucursal")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategoriaPlato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    private Sucursal sucursal;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @ManyToMany(mappedBy = "categorias")
    @Builder.Default
    @JsonIgnore
    private List<Plato> platos = new ArrayList<>();
}
