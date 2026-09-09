package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Receta de un plato con versionado.
 * Modificar una receta crea una nueva versión (nunca se borran).
 * Solo la versión más reciente está activa para producción.
 */
@Entity
@Table(name = "recetas", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"plato_id", "version"}, name = "uk_receta_plato_version")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Receta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plato_id", nullable = false)
    @JsonIgnore
    private Plato plato;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activa = false;

    @Column(length = 500)
    private String notas;

    @Column(nullable = false)
    @Builder.Default
    private Double costoTotal = 0.0;

    @OneToMany(mappedBy = "receta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<RecetaIngrediente> ingredientes = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
