package com.restaurante.service;

import com.restaurante.entity.CierreCaja;
import com.restaurante.entity.MovimientoCaja;
import com.restaurante.enums.TipoMovimientoCaja;

import java.util.List;
import java.util.Optional;

public interface CierreCajaService {
    CierreCaja abrir(Long sucursalId, Double montoInicial, Long usuarioId);
    CierreCaja cerrar(Long id, Double montoFinalDeclarado, String observaciones, Long usuarioId);
    CierreCaja obtenerPorId(Long id);
    Optional<CierreCaja> obtenerAbiertoPorCajero(Long usuarioId);
    List<CierreCaja> listarPorSucursal(Long sucursalId);
    MovimientoCaja registrarMovimiento(Long cierreCajaId, TipoMovimientoCaja tipo, Double monto, String motivo, Long usuarioId);
    List<MovimientoCaja> listarMovimientos(Long cierreCajaId);
}
