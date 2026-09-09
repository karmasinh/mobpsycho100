package com.restaurante.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Rol dinámico: cada rol tiene un nombre único y una lista de módulos/menús a los que puede acceder.
 * Al crear el rol se le asignan los módulos; cualquier usuario con ese rol hereda esos accesos.
 */
@Entity
@Table(name = "roles", uniqueConstraints = {
        @UniqueConstraint(columnNames = "nombre", name = "uk_rol_nombre")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre del rol, ej: ADMIN, COCINERO, CAJERO, GERENTE_SUCURSAL */
    @Column(nullable = false, unique = true, length = 80)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    /**
     * Módulos/menús a los que tiene acceso este rol.
     * Relación ManyToMany con ModuloMenu.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "rol_modulos",
            joinColumns = @JoinColumn(name = "rol_id"),
            inverseJoinColumns = @JoinColumn(name = "modulo_id")
    )
    @Builder.Default
    private Set<ModuloMenu> modulos = new HashSet<>();

    @OneToMany(mappedBy = "rol", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<Usuario> usuarios = new ArrayList<>();
}
