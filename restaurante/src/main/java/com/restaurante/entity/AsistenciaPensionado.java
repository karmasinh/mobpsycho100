package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asistencias_pensionado", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"pensionado_id", "fecha"}, name = "uk_asistencia_pensionado_fecha")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AsistenciaPensionado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pensionado_id", nullable = false)
    @JsonIgnore
    private Pensionado pensionado;

    public Long getPensionadoId() {
        return pensionado != null ? pensionado.getId() : null;
    }

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    @Builder.Default
    private Boolean asistio = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    @JsonIgnore
    private Usuario registradoPor;

    public Long getRegistradoPorId() {
        return registradoPor != null ? registradoPor.getId() : null;
    }

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
