package com.restaurante.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Perfil único del negocio (no multi-tenant: se espera una sola fila). Su
 * ausencia es la señal para mostrar el asistente de bienvenida en el primer
 * arranque, antes de poder crear sucursales.
 */
@Entity
@Table(name = "empresa")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 40)
    private String nit;

    @Column(length = 200)
    private String direccion;

    @Column(length = 20)
    private String telefono;

    @Column(length = 300)
    private String logoUrl;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;
}
