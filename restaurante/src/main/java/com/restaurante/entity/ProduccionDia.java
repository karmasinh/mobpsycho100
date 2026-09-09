package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoProduccion;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "produccion_dia",
        uniqueConstraints = @UniqueConstraint(columnNames = {"fecha", "sucursal_id"}, name = "uk_produccion_fecha_sucursal"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProduccionDia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoProduccion estado = EstadoProduccion.PLANIFICADO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sucursal sucursal;

    @OneToMany(mappedBy = "produccion", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LineaProduccion> lineas = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
