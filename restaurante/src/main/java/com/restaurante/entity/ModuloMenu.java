package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * Módulo/Menú del sistema. Cada pantalla o sección del sistema es un módulo.
 * Los módulos son fijos (definidos por el sistema), los roles son dinámicos y
 * se les asignan qué módulos pueden ver.
 */
@Entity
@Table(name = "modulos_menu", uniqueConstraints = {
        @UniqueConstraint(columnNames = "codigo", name = "uk_modulo_codigo")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ModuloMenu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Código único del módulo, ej: MOD_INVENTARIO, MOD_VENTAS, MOD_COCINA */
    @Column(nullable = false, unique = true, length = 60)
    private String codigo;

    /** Nombre visible en la UI */
    @Column(nullable = false, length = 100)
    private String nombre;

    /** Icono para el menú lateral (nombre de icono o clase CSS) */
    @Column(length = 60)
    private String icono;

    /** Ruta de la pantalla en el frontend */
    @Column(length = 150)
    private String ruta;

    /** Módulo padre para submenús (null = menú raíz) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "padre_id")
    @JsonIgnore
    private ModuloMenu padre;

    /** ID del padre serializado como campo plano — seguro con proxies Hibernate */
    public Long getPadreId() {
        return padre != null ? padre.getId() : null;
    }

    /** Orden de aparición en el menú */
    @Column(nullable = false)
    @Builder.Default
    private Integer orden = 0;

    /** Módulo: COCINA o VENTAS (para agrupar visualmente) */
    @Column(length = 30)
    private String sistema;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @ManyToMany(mappedBy = "modulos")
    @Builder.Default
    @JsonIgnore
    private Set<Rol> roles = new HashSet<>();
}
