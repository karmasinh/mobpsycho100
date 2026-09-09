package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.CanalRecuperacion;
import com.restaurante.enums.EstadoCliente;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "clientes", uniqueConstraints = {
        @UniqueConstraint(columnNames = "telefono", name = "uk_cliente_telefono"),
        @UniqueConstraint(columnNames = "correo", name = "uk_cliente_correo")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(unique = true, length = 20)
    private String telefono;

    @Column(unique = true, length = 150)
    private String correo;

    @Column(nullable = false)
    private LocalDate fechaRegistro;

    private LocalDate ultimaCompra;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoCliente estado = EstadoCliente.CLIENTE_NUEVO;

    @Enumerated(EnumType.STRING)
    private CanalRecuperacion canalRecuperacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    private Sucursal sucursal;

    @OneToMany(mappedBy = "cliente", fetch = FetchType.LAZY)
@Builder.Default
@JsonIgnore
private List<Pedido> pedidos = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;
}
