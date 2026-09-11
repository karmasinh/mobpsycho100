package com.restaurante.service.impl;

import com.restaurante.dto.request.ConfiguracionTicketRequest;
import com.restaurante.entity.ConfiguracionTicket;
import com.restaurante.entity.Sucursal;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.ConfiguracionTicketRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.service.ConfiguracionTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConfiguracionTicketServiceImpl implements ConfiguracionTicketService {

    private final ConfiguracionTicketRepository configuracionTicketRepository;
    private final SucursalRepository sucursalRepository;

    @Override
    public ConfiguracionTicket obtener(Long sucursalId) {
        return configuracionTicketRepository.findBySucursalId(sucursalId)
                .orElseGet(() -> defaultParaSucursal(sucursalId));
    }

    @Override
    @Transactional
    public ConfiguracionTicket guardar(Long sucursalId, ConfiguracionTicketRequest request) {
        ConfiguracionTicket config = configuracionTicketRepository.findBySucursalId(sucursalId)
                .orElseGet(() -> crearParaSucursal(sucursalId));

        config.setRazonSocial(request.getRazonSocial());
        config.setNit(request.getNit());
        config.setDireccion(request.getDireccion());
        config.setTelefono(request.getTelefono());
        config.setLogoBase64(request.getLogoBase64());
        if (request.getMostrarCajero() != null) config.setMostrarCajero(request.getMostrarCajero());
        if (request.getMostrarCliente() != null) config.setMostrarCliente(request.getMostrarCliente());
        if (request.getMostrarFormaPago() != null) config.setMostrarFormaPago(request.getMostrarFormaPago());
        if (request.getMostrarObservaciones() != null) config.setMostrarObservaciones(request.getMostrarObservaciones());
        if (request.getMostrarNumeroPedido() != null) config.setMostrarNumeroPedido(request.getMostrarNumeroPedido());
        config.setMensajePie(request.getMensajePie());
        config.setLeyendaLegal(request.getLeyendaLegal());
        if (request.getAnchoMm() != null) config.setAnchoMm(request.getAnchoMm());
        if (request.getCopias() != null) config.setCopias(request.getCopias());
        if (request.getImprimirAutomatico() != null) config.setImprimirAutomatico(request.getImprimirAutomatico());
        config.setPrefijo(request.getPrefijo());

        return configuracionTicketRepository.save(config);
    }

    @Override
    @Transactional
    public String siguienteNumeroTicket(Long sucursalId) {
        ConfiguracionTicket config = configuracionTicketRepository.findBySucursalIdParaActualizar(sucursalId)
                .orElseGet(() -> configuracionTicketRepository.save(crearParaSucursal(sucursalId)));

        long siguiente = config.getCorrelativoActual() + 1;
        config.setCorrelativoActual(siguiente);
        configuracionTicketRepository.save(config);

        String prefijo = config.getPrefijo() != null && !config.getPrefijo().isBlank() ? config.getPrefijo() : "";
        return prefijo + String.format("%06d", siguiente);
    }

    private ConfiguracionTicket crearParaSucursal(Long sucursalId) {
        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", sucursalId));
        return configuracionTicketRepository.save(ConfiguracionTicket.builder().sucursal(sucursal).build());
    }

    private ConfiguracionTicket defaultParaSucursal(Long sucursalId) {
        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", sucursalId));
        return ConfiguracionTicket.builder().sucursal(sucursal).build();
    }
}
