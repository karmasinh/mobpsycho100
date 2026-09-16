package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoCiclo;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ciclos_pensionado")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CicloPensionado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pensionado_id", nullable = false)
    @JsonIgnore
    private Pensionado pensionado;

    public Long getPensionadoId() { return pensionado != null ? pensionado.getId() : null; }

    @Column(nullable = false)
    private LocalDate fechaInicio;

    private LocalDate fechaFin;

    @Column(nullable = false)
    @Builder.Default
    private Integer diasTotal = 26;

    @Column(nullable = false)
    @Builder.Default
    private Integer diasConsumidos = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoCiclo estado = EstadoCiclo.ACTIVO;

    @Column(nullable = false)
    private Double montoPagado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    @JsonIgnore
    private Usuario registradoPor;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
