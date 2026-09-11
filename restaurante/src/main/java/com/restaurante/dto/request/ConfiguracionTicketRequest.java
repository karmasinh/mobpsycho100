package com.restaurante.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConfiguracionTicketRequest {

    @Size(max = 150) private String razonSocial;
    @Size(max = 30)  private String nit;
    @Size(max = 200) private String direccion;
    @Size(max = 30)  private String telefono;
    private String logoBase64;

    private Boolean mostrarCajero;
    private Boolean mostrarCliente;
    private Boolean mostrarFormaPago;
    private Boolean mostrarObservaciones;
    private Boolean mostrarNumeroPedido;

    @Size(max = 300) private String mensajePie;
    @Size(max = 300) private String leyendaLegal;

    @Min(value = 40, message = "El ancho mínimo es 40mm")
    @Max(value = 120, message = "El ancho máximo es 120mm")
    private Integer anchoMm;

    @Min(value = 1) @Max(value = 5)
    private Integer copias;

    private Boolean imprimirAutomatico;

    @Size(max = 10)
    private String prefijo;
}
