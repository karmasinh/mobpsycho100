package com.restaurante.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_log")
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditoriaLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String accion;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @Column(nullable = false, length = 100)
    private String entidad;

    private Long entidadId;

    @Column(length = 45)
    private String ip;

    @Column(length = 150)
    private String username;

    @Column(columnDefinition = "TEXT")
    private String valorAnterior;

    @Column(columnDefinition = "TEXT")
    private String valorNuevo;

    // Constructor con timestamp automático
    @PrePersist
    public void prePersist() {
        if (this.creadoEn == null) {
            this.creadoEn = LocalDateTime.now();
        }
    }
}