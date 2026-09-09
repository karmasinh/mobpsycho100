package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "detalles_pedido")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DetallePedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false)
    @JsonIgnore
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plato_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "recetas", "categorias"})
    private Plato plato;

    /** Solo para tipo ALMUERZO: qué sopa eligió el cliente */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sopa_seleccionada_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "recetas", "categorias"})
    private Plato sopaSeleccionada;

    /** Solo para tipo ALMUERZO: qué segundo eligió el cliente */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "segundo_seleccionado_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "recetas", "categorias"})
    private Plato segundoSeleccionado;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(nullable = false)
    private Double precioUnitario;

    @Column(length = 255)
    private String observaciones;

    @Transient
    public double getSubtotal() {
        return precioUnitario * cantidad;
    }
}
