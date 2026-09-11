package com.restaurante.siat;

import com.restaurante.exception.NegocioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Frontera con los servicios web del SIN (SIAT).
 *
 * <p><b>Stub explícito.</b> Este proyecto académico implementa solo los cimientos de la
 * facturación electrónica: la entidad, los endpoints, la generación del XML localmente y el
 * estado/configuración. Conectar de verdad requiere:
 * <ol>
 *   <li>El <b>token del contribuyente</b>, que se obtiene en la Oficina Virtual del SIN.</li>
 *   <li>Un <b>certificado digital</b> para firmar el XML.</li>
 *   <li>Los clientes SOAP generados a partir de los WSDL oficiales del SIN.</li>
 * </ol>
 * Nada de eso está disponible para un contribuyente boliviano real en este contexto, así que
 * esta clase nunca "envía" nada de verdad: {@link #estaConfigurado()} devuelve {@code false}
 * salvo que se active explícitamente la propiedad {@code app.siat.habilitado} (lo que hoy no
 * pasa en ningún ambiente), y cualquier intento de enviar algo al SIN falla con un mensaje
 * claro en vez de fingir que funcionó.
 *
 * <p>El día que se conecten los servicios reales, esta es la única clase que debería cambiar:
 * el resto del sistema (servicio, controlador, pantallas) no depende de cómo se habla con el
 * SIN, solo de esta frontera.
 */
@Component
public class ClienteSiat {

    public static final String MENSAJE_NO_CONFIGURADO =
            "Conexión al SIN no configurada — este proyecto implementa solo los cimientos de "
          + "facturación electrónica (entidad, XML local, estado/configuración), sin conexión "
          + "real a los servicios web del SIN. Se necesitaría el token del contribuyente y el "
          + "certificado digital de una empresa boliviana registrada para completarla.";

    /** Vacío/false por defecto: no hay ambiente en el que esto esté realmente encendido hoy. */
    @Value("${app.siat.habilitado:false}")
    private boolean habilitado;

    /** Si hay credenciales reales y se puede hablar con el SIN. Hoy, siempre false. */
    public boolean estaConfigurado() {
        return habilitado;
    }

    /** Enviaría la factura al SIN. Sin conexión real, siempre falla con un mensaje claro. */
    public void enviarFactura(Object... contexto) {
        throw new NegocioException(MENSAJE_NO_CONFIGURADO);
    }

    /** Comunicaría la anulación de una factura ya aceptada. Sin conexión real, siempre falla. */
    public void anularFactura(Object... contexto) {
        throw new NegocioException(MENSAJE_NO_CONFIGURADO);
    }
}
