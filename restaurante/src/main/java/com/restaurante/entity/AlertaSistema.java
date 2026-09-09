package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.TipoAlerta;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "alertas_sistema")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlertaSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAlerta tipo;

    @Column(nullable = false, length = 255)
    private String mensaje;

    /** Referencia al lote, insumo, cliente, etc. */
    private Long entidadReferenciaId;

    @Column(length = 80)
    private String entidadReferenciaNombre;

    @Column(nullable = false)
    @Builder.Default
    private Boolean leida = false;

    private LocalDateTime leidaEn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leida_por_id")
    private Usuario leidaPor;

    /** Solo se completa en alertas de inventario (stock mínimo, vencimientos); null = visible para todas las sucursales */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "clientes"})
    private Sucursal sucursal;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
