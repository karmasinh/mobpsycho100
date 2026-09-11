package com.restaurante.siat;

/**
 * Convierte un monto en bolivianos a su expresión en letras, como exige la normativa boliviana
 * de facturación ("Son: Cuarenticinco 00/100 Bolivianos"). No existía un conversor equivalente
 * en el resto del proyecto (se revisaron los reportes de caja/ventas antes de escribir este).
 *
 * <p>Cubre números enteros de 0 a 999.999.999 — más que suficiente para un total de factura — y
 * usa las formas apocopadas propias del castellano boliviano/latinoamericano ("veintiuno",
 * "cuarenticinco" en vez de "cuarenta y cinco") tal como aparecen en facturas reales del país.
 */
public final class NumeroALetrasConverter {

    private static final String[] UNIDADES = {
            "", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
            "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho",
            "diecinueve", "veinte"
    };

    private static final String[] DECENAS = {
            "", "", "veinti", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"
    };

    private static final String[] CENTENAS = {
            "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos",
            "setecientos", "ochocientos", "novecientos"
    };

    private NumeroALetrasConverter() {
    }

    /** "Son: Cuarenticinco 00/100 Bolivianos" a partir de 45.00. Null/negativo se trata como 0. */
    public static String importeEnLetras(Double monto) {
        double valor = monto == null || monto < 0 ? 0.0 : monto;
        long enteros = (long) valor;
        int centavos = (int) Math.round((valor - enteros) * 100);
        if (centavos == 100) { // redondeo de borde, ej. 45.999
            enteros += 1;
            centavos = 0;
        }

        String letras = enteros == 0 ? "cero" : convertir(enteros);
        String capitalizada = letras.substring(0, 1).toUpperCase() + letras.substring(1);

        return String.format("Son: %s %02d/100 Bolivianos", capitalizada, centavos);
    }

    private static String convertir(long numero) {
        if (numero == 0) return "";
        if (numero == 100) return "cien";
        if (numero < 21) return UNIDADES[(int) numero];
        if (numero < 30) return "veinti" + convertir(numero - 20);
        if (numero < 100) {
            long decena = numero / 10;
            long resto = numero % 10;
            return resto == 0 ? DECENAS[(int) decena] : DECENAS[(int) decena] + " y " + convertir(resto);
        }
        if (numero < 1000) {
            long centena = numero / 100;
            long resto = numero % 100;
            return resto == 0 ? CENTENAS[(int) centena] : CENTENAS[(int) centena] + " " + convertir(resto);
        }
        if (numero < 1_000_000) {
            long miles = numero / 1000;
            long resto = numero % 1000;
            String prefijoMiles = miles == 1 ? "mil" : convertir(miles) + " mil";
            return resto == 0 ? prefijoMiles : prefijoMiles + " " + convertir(resto);
        }
        if (numero < 1_000_000_000) {
            long millones = numero / 1_000_000;
            long resto = numero % 1_000_000;
            String prefijoMillones = millones == 1 ? "un millón" : convertir(millones) + " millones";
            return resto == 0 ? prefijoMillones : prefijoMillones + " " + convertir(resto);
        }
        return String.valueOf(numero); // fuera de rango esperado para un total de factura
    }
}
