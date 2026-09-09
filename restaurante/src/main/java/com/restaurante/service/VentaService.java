package com.restaurante.service;

import com.restaurante.dto.response.RentabilidadPlatoDto;
import com.restaurante.dto.response.TopProductoDto;
import com.restaurante.dto.response.VentaPorSucursalDto;
import com.restaurante.entity.Venta;
import com.restaurante.enums.FormaPago;

import java.time.LocalDateTime;
import java.util.List;

public interface VentaService {
    Venta cobrar(Long pedidoId, Double montoRecibido, FormaPago formaPago, Long usuarioId);
    void anular(Long ventaId, String motivo, Long usuarioId);
    Venta obtenerPorId(Long id);
    List<Venta> listarEntreFechas(LocalDateTime desde, LocalDateTime hasta, Long sucursalId);
    Double totalEntreFechas(LocalDateTime desde, LocalDateTime hasta, Long sucursalId);
    List<TopProductoDto> topProductos(LocalDateTime desde, LocalDateTime hasta, int limit, Long sucursalId);
    List<RentabilidadPlatoDto> rentabilidadPorPlato(LocalDateTime desde, LocalDateTime hasta, Long sucursalId);
    List<VentaPorSucursalDto> comparativoPorSucursal(LocalDateTime desde, LocalDateTime hasta);
}
