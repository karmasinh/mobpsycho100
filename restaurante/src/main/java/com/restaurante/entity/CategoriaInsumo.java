

package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categorias_insumo", uniqueConstraints = {
        @UniqueConstraint(columnNames = "nombre", name = "uk_cat_insumo_nombre")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor 
@Builder
public class CategoriaInsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @OneToMany(mappedBy = "categoria", fetch = FetchType.LAZY)
@Builder.Default
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@JsonIgnore  // ya lo tienes, está bien
private List<Insumo> insumos = new ArrayList<>();

}
