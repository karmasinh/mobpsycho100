import { Injectable } from '@angular/core';
import unidadesData from '../../../assets/data/unidades-medida.json';

/**
 * Capa de presentación/cálculo rápido en el frontend para las unidades de
 * medida (DEC-L-005). NO reemplaza a `UnidadConversionService` del backend
 * (fuente de verdad para persistencia/negocio) — esto es solo para mostrar
 * equivalencias al usuario sin ida y vuelta al servidor.
 *
 * `resolveJsonModule` está activo en tsconfig.json, así que el catálogo se
 * importa directo como módulo TS (sin HttpClient/asset fetch).
 */

export type CategoriaUnidad = 'MASA' | 'VOLUMEN' | 'UNIDAD';

export interface CategoriaUnidadMedida {
  id: CategoriaUnidad;
  nombre: string;
  unidadBase: string;
}

export interface UnidadMedidaJson {
  codigo: string;
  nombre: string;
  categoria: CategoriaUnidad;
  factorABase: number;
  porDefectoBolivia: boolean;
}

export interface EquivalenteUnidad {
  codigo: string;
  nombre: string;
  valor: number;
}

interface UnidadesMedidaCatalogo {
  categorias: CategoriaUnidadMedida[];
  unidades: UnidadMedidaJson[];
}

const CATALOGO = unidadesData as UnidadesMedidaCatalogo;

/**
 * Alias de texto libre → código canónico, espejo reducido del mapa `ALIAS`
 * de `UnidadConversionService.java` en el backend — solo para reconocer, en
 * la UI, la unidad ya guardada en un insumo/ingrediente (campo de texto
 * libre) y ofrecerle equivalencias. No reemplaza la normalización real del
 * backend, que sigue siendo la autoridad.
 */
const ALIAS: Record<string, string> = {
  kg: 'kg', kilo: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  g: 'g', gr: 'g', gramo: 'g', gramos: 'g',
  mg: 'mg', miligramo: 'mg', miligramos: 'mg',
  l: 'l', lt: 'l', litro: 'l', litros: 'l',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  unidad: 'unidad', unidades: 'unidad', und: 'unidad', unid: 'unidad', pieza: 'unidad', piezas: 'unidad',
  docena: 'docena', docenas: 'docena',
  lb: 'lb', lbs: 'lb', libra: 'lb', libras: 'lb',
  oz: 'oz', onza: 'oz', onzas: 'oz',
  arroba: 'arroba', arrobas: 'arroba',
  qq: 'qq', quintal: 'qq', quintales: 'qq',
  ozfl: 'ozfl', ozliq: 'ozfl', onzaliquida: 'ozfl', onzasliquidas: 'ozfl',
  taza: 'taza', tazas: 'taza',
  cucharada: 'cucharada', cucharadas: 'cucharada', cda: 'cucharada',
  cucharadita: 'cucharadita', cucharaditas: 'cucharadita', cdta: 'cucharadita',
  par: 'par', pares: 'par',
};

@Injectable({ providedIn: 'root' })
export class UnidadesConversionService {

  readonly categorias: CategoriaUnidadMedida[] = CATALOGO.categorias;
  readonly unidades: UnidadMedidaJson[] = CATALOGO.unidades;

  private readonly porCodigo = new Map<string, UnidadMedidaJson>(
    this.unidades.map(u => [u.codigo, u])
  );

  /** Redondeo explícito para valores MOSTRADOS al usuario — nunca usar para cálculos internos. */
  redondear(valor: number, decimales = 2): number {
    const factor = Math.pow(10, decimales);
    return Math.round((valor + Number.EPSILON) * factor) / factor;
  }

  unidad(codigo: string): UnidadMedidaJson | undefined {
    return this.porCodigo.get(codigo);
  }

  /** Normaliza texto libre ("Kg.", " litros ") al código canónico del catálogo, si se reconoce. */
  normalizar(textoLibre: string | null | undefined): string | null {
    if (!textoLibre) return null;
    const base = textoLibre
      .trim().toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]/g, '');
    return ALIAS[base] ?? null;
  }

  unidadesPorCategoria(categoria: CategoriaUnidad): UnidadMedidaJson[] {
    return this.unidades.filter(u => u.categoria === categoria);
  }

  /** Códigos de las unidades marcadas como estándar boliviano/métrico (g, kg, ml, l, unidad). */
  unidadesPorDefectoBolivia(): string[] {
    return this.unidades.filter(u => u.porDefectoBolivia).map(u => u.codigo);
  }

  /**
   * Convierte `cantidad` de `origenCodigo` a `destinoCodigo`. Misma semántica
   * que el backend: si no son de la misma categoría (o el código no existe),
   * devuelve `null` en vez de un valor incorrecto. Sin redondear — precisión
   * completa para cálculos.
   */
  convertir(cantidad: number, origenCodigo: string, destinoCodigo: string): number | null {
    const origen = this.unidad(origenCodigo);
    const destino = this.unidad(destinoCodigo);
    if (!origen || !destino) return null;
    if (origen.categoria !== destino.categoria) return null;

    const enUnidadBase = cantidad * origen.factorABase;
    return enUnidadBase / destino.factorABase;
  }

  /**
   * Todas las unidades de la misma categoría que `origenCodigo`, con su valor
   * convertido (sin la propia unidad de origen). Los valores devueltos vienen
   * redondeados a 2 decimales — son para MOSTRAR, no para recálculos.
   */
  equivalentes(cantidad: number, origenCodigo: string): EquivalenteUnidad[] {
    const origen = this.unidad(origenCodigo);
    if (!origen) return [];

    return this.unidades
      .filter(u => u.categoria === origen.categoria && u.codigo !== origen.codigo)
      .map(u => ({
        codigo: u.codigo,
        nombre: u.nombre,
        valor: this.redondear(this.convertir(cantidad, origenCodigo, u.codigo) ?? 0),
      }));
  }
}
