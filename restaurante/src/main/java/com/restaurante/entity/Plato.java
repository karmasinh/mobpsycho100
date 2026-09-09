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

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "platos", uniqueConstraints = {
        @UniqueConstraint(columnNames = "codigo", name = "uk_plato_codigo")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(nullable = false)
    private Double precioVenta;

    /** Costo estimado calculado automáticamente a partir de la receta activa */
    @Column(nullable = false)
    @Builder.Default
    private Double costoEstimado = 0.0;

    /** Tipo de plato: ALMUERZO, EMPANADA, TUCUMANA, REFRESCO, LICUADO, ESPECIAL, etc. */
    @Column(length = 40)
    private String tipo;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "plato_categorias",
            joinColumns = @JoinColumn(name = "plato_id"),
            inverseJoinColumns = @JoinColumn(name = "categoria_id")
    )
    @Builder.Default
    private List<CategoriaPlato> categorias = new ArrayList<>();

    @OneToMany(mappedBy = "plato", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<Receta> recetas = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    /** Margen de ganancia calculado en tiempo real */
    @Transient
    public double getMargenGanancia() {
        return precioVenta - costoEstimado;
    }
}
