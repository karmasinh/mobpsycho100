package com.restaurante.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

/**
 * Configuración del ticket/comprobante de venta impreso al cliente, una por sucursal.
 * Adoptado del sistema base (LINEAMIENTOS MAESTROS Y PROYECTOS REFERENCIALES/SistemaDesk,
 * docs/correcciones-sugeridas/03-ticket-venta-configurable.md) — no existía ningún
 * comprobante para el cliente, solo la comanda interna de cocina.
 */
@Entity
@Table(name = "configuracion_ticket")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConfiguracionTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sucursal_id", unique = true, nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sucursal sucursal;

    // Encabezado
    @Column(length = 150) private String razonSocial;
    @Column(length = 30)  private String nit;
    @Column(length = 200) private String direccion;
    @Column(length = 30)  private String telefono;
    @Column(columnDefinition = "TEXT") private String logoBase64;

    // Cuerpo — qué mostrar en el ticket
    @Builder.Default private Boolean mostrarCajero        = true;
    @Builder.Default private Boolean mostrarCliente       = true;
    @Builder.Default private Boolean mostrarFormaPago     = true;
    @Builder.Default private Boolean mostrarObservaciones = true;
    @Builder.Default private Boolean mostrarNumeroPedido  = true;

    // Pie
    @Column(length = 300) private String mensajePie;
    @Column(length = 300) private String leyendaLegal;

    // Formato de impresión
    @Builder.Default private Integer anchoMm = 80;
    @Builder.Default private Integer copias  = 1;
    @Builder.Default private Boolean imprimirAutomatico = true;

    // Numeración correlativa del ticket, propia de la sucursal
    @Builder.Default private Long correlativoActual = 0L;
    @Column(length = 10) private String prefijo;
}
