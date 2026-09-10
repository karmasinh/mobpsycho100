package com.restaurante.entity;

import com.restaurante.enums.TipoMagnitud;
import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo de unidades de medida con su factor de conversión a la unidad
 * base de su magnitud (gramo para MASA, mililitro para VOLUMEN, unidad para
 * UNIDAD). Permite convertir cantidades entre unidades de la misma magnitud
 * (ej. registrar consumo en mililitros de un insumo cuyo costo está fijado
 * por litro).
 */
@Entity
@Table(name = "unidades_medida", uniqueConstraints = {
        @UniqueConstraint(columnNames = "codigo", name = "uk_unidad_medida_codigo")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnidadMedida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 15)
    private String codigo;

    @Column(nullable = false, length = 40)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMagnitud tipoMagnitud;

    /** Factor multiplicativo para convertir 1 unidad de esto a la unidad base de su magnitud. */
    @Column(nullable = false)
    private Double factorABase;
}
