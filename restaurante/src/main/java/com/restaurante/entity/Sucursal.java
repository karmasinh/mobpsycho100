package com.restaurante.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "sucursales", uniqueConstraints = {
        @UniqueConstraint(columnNames = "nombre", name = "uk_sucursal_nombre")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Sucursal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 200)
    private String direccion;

    @Column(length = 20)
    private String telefono;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    @OneToMany(mappedBy = "sucursal", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<Empleado> empleados = new ArrayList<>();

    @OneToMany(mappedBy = "sucursal", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<Cliente> clientes = new ArrayList<>();
}
