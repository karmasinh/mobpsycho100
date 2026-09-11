package com.restaurante.dto.request;

import com.restaurante.enums.AmbienteFacturacion;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ConfiguracionFacturacionRequest {

    @Size(max = 20)  private String nit;
    @Size(max = 200) private String razonSocial;
    @Size(max = 100) private String municipio;
    @Size(max = 500) private String leyendaFactura;

    private AmbienteFacturacion ambiente;
    private Boolean facturacionHabilitada;

    // Códigos de habilitación: se pueden cargar a mano, o generar como DEMO desde los
    // endpoints /cuis y /cufd (no hay conexión real al SIN en este proyecto).
    @Size(max = 100) private String cuis;
    private LocalDateTime cuisVigenteHasta;

    @Size(max = 100) private String cufd;
    @Size(max = 100) private String cufdCodigoControl;
    @Size(max = 250) private String cufdDireccion;
    private LocalDateTime cufdVigenteHasta;
}
