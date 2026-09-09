package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.FormaPago;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cobros_mensuales", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"pensionado_id", "mes", "anio"}, name = "uk_cobro_pensionado_mes_anio")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CobroMensual {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pensionado_id", nullable = false)
    @JsonIgnore
    private Pensionado pensionado;

    public Long getPensionadoId() { return pensionado != null ? pensionado.getId() : null; }
    public String getPensionadoNombre() { return pensionado != null ? pensionado.getNombre() : null; }
    public String getPensionadoApellido() { return pensionado != null ? pensionado.getApellido() : null; }

    @Column(nullable = false)
    private Integer mes;

    @Column(nullable = false)
    private Integer anio;

    @Column(nullable = false)
    private Double montoBase;

    /** Saldo pendiente del mes anterior incluido en este cobro */
    @Column(nullable = false)
    @Builder.Default
    private Double saldoAnterior = 0.0;

    @Column(nullable = false)
    private Double totalCobrado;

    @Column(nullable = false)
    @Builder.Default
    private Double montoPagado = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double saldoRestante = 0.0;

    @Enumerated(EnumType.STRING)
    private FormaPago formaPago;

    @Column(nullable = false)
    @Builder.Default
    private Integer diasAsistidos = 0;

    private LocalDate fechaPago;

    @Column(nullable = false)
    @Builder.Default
    private Boolean pagado = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    @JsonIgnore
    private Usuario registradoPor;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
