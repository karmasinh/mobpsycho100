package com.restaurante.service.ia;

/** Un proveedor de IA generativa capaz de responder un prompt de texto libre. */
public interface SugerenciaIaProvider {

    /** Código usado por el frontend para elegir este proveedor (ej. "GEMINI"). */
    String codigo();

    /** True si hay una clave configurada para este proveedor. */
    boolean disponible();

    /** Envía el prompt al proveedor y devuelve el texto de respuesta. */
    String sugerir(String prompt);
}
