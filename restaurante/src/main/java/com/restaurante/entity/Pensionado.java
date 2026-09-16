package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.restaurante.enums.EstadoPensionado;
import com.restaurante.enums.ModoFacturacionPensionado;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pensionados", uniqueConstraints = {
        @UniqueConstraint(columnNames = "cedula", name = "uk_pensionado_cedula"),
        @UniqueConstraint(columnNames = "telefono", name = "uk_pensionado_telefono"),
        @UniqueConstraint(columnNames = "correo", name = "uk_pensionado_correo")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Pensionado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, length = 150)
    private String apellido;

    @Column(nullable = false, unique = true, length = 20)
    private String cedula;

    @Column(unique = true, length = 20)
    private String telefono;

    @Column(unique = true, length = 150)
    private String correo;

    @Column(nullable = false)
    private LocalDate fechaInscripcion;

    private LocalDate fechaBaja;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoPensionado estado = EstadoPensionado.ACTIVO;

    /** Tipo de almuerzo contratado (precio mensual fijo) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_almuerzo_id")
    private TipoAlmuerzo tipoAlmuerzo;

    /**
     * Sucursal donde el pensionado está inscrito. Nullable por compatibilidad
     * con filas existentes (ddl-auto=update), pero obligatorio para altas nuevas
     * — ver PensionadoServiceImpl.registrar / SucursalAccessService.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sucursal sucursal;

    /** Saldo pendiente acumulado de meses anteriores */
    @Column(nullable = false)
    @Builder.Default
    private Double saldoPendiente = 0.0;

    /**
     * Token fijo (UUID) para el autoservicio QR del pensionado (ver
     * PensionadoAutoServicioController): con este token, sin login, el pensionado
     * puede marcar su propia asistencia del día y ver su info de solo-consulta.
     *
     * Nullable a propósito (ddl-auto=update sobre filas existentes) y generado de
     * forma perezosa la primera vez que el staff pide el QR
     * (PensionadoServiceImpl.obtenerOGenerarQrToken) — evita necesitar un runner de
     * backfill aparte para los pensionados creados antes de este campo.
     */
    @Column(unique = true, length = 36)
    private String qrToken;

    /**
     * Modo de facturación: MENSUAL (cobro mensual clásico, comportamiento actual)
     * o CICLO_26D (ciclo prepago de 26 días de asistencias, ver CicloPensionado).
     * Nullable/@Builder.Default por compatibilidad con filas existentes
     * (ddl-auto=update) — mismo criterio que sucursal/qrToken en esta entidad.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ModoFacturacionPensionado modoFacturacion = ModoFacturacionPensionado.MENSUAL;

    @OneToMany(mappedBy = "pensionado", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<AsistenciaPensionado> asistencias = new ArrayList<>();

    @OneToMany(mappedBy = "pensionado", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<CobroMensual> cobros = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    public String getNombreCompleto() {
        return nombre + " " + apellido;
    }
}
