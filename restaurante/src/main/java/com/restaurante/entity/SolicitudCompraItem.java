package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "solicitud_compra_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SolicitudCompraItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitud_compra_id", nullable = false)
    @JsonIgnore
    private SolicitudCompra solicitudCompra;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insumo_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "lotes", "movimientos"})
    private Insumo insumo;

    @Column(nullable = false)
    private Double cantidadSolicitada;

    @Column(length = 255)
    private String observaciones;
}
