package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "usuarios", uniqueConstraints = {
        @UniqueConstraint(columnNames = "username", name = "uk_usuario_username")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String username;

    @Column(nullable = false)
    @JsonIgnore
    private String passwordHash;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rol_id", nullable = false)
    @JsonIgnoreProperties({"modulos", "usuarios"})
    private Rol rol;

    /** Empleado vinculado — ignorado para evitar referencia circular con Empleado.usuario */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empleado_id")
    @JsonIgnore
    private Empleado empleado;

    /** Cliente vinculado */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    @JsonIgnore
    private Cliente cliente;

    /** Pensionado vinculado */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pensionado_id")
    @JsonIgnore
    private Pensionado pensionado;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(nullable = false)
    @Builder.Default
    private Integer intentosFallidos = 0;

    private LocalDateTime ultimoIntentoFallido;
    private LocalDateTime bloqueadoEn;
    private LocalDateTime ultimoAcceso;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    public boolean estaBloqueado() {
        return !activo || intentosFallidos >= 3;
    }

    public void registrarIntentoFallido() {
        this.intentosFallidos++;
        this.ultimoIntentoFallido = LocalDateTime.now();
        if (this.intentosFallidos >= 3) {
            this.activo = false;
            this.bloqueadoEn = LocalDateTime.now();
        }
    }

    public void desbloquear() {
        this.intentosFallidos = 0;
        this.activo = true;
        this.bloqueadoEn = null;
        this.ultimoIntentoFallido = null;
    }

    public void registrarAccesoExitoso() {
        this.intentosFallidos = 0;
        this.ultimoAcceso = LocalDateTime.now();
    }
}
