package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoPedido;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "pedidos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "pedidos"})
    private Cliente cliente;

    /** Pensionado que realizó el pedido (si aplica) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pensionado_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "pedidos", "asistencias", "cobros"})
    private Pensionado pensionado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empleado_cajero_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "pedidos", "ventas", "sucursal"})
    private Empleado cajero;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "empleados", "pedidos"})
    private Sucursal sucursal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoPedido estado = EstadoPedido.PENDIENTE;

    @Column(nullable = false)
    @Builder.Default
    private Double total = 0.0;

    @Column(length = 255)
    private String observaciones;

    /** Venta generada al cerrar el pedido (Venta.pedido tiene @JsonIgnore para evitar circular) */
    @OneToOne(mappedBy = "pedido", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Venta venta;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DetallePedido> detalles = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    public void calcularTotal() {
        this.total = detalles.stream()
                .mapToDouble(d -> d.getPrecioUnitario() * d.getCantidad())
                .sum();
    }
}
