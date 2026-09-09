package com.restaurante.security;

import com.restaurante.entity.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserDetailsImpl implements UserDetails {

    private final Long id;
    private final String username;
    private final String password;
    private final boolean activo;
    private final Collection<? extends GrantedAuthority> authorities;
    private final List<String> modulos;
    private final Long sucursalId;
    private final String sucursalNombre;

    public UserDetailsImpl(Usuario usuario) {
        this.id = usuario.getId();
        this.username = usuario.getUsername();
        this.password = usuario.getPasswordHash();
        this.activo = usuario.getActivo();
        String rolNombre = "ROLE_" + usuario.getRol().getNombre().toUpperCase();
        this.authorities = List.of(new SimpleGrantedAuthority(rolNombre));
        this.modulos = usuario.getRol().getModulos().stream()
                .filter(m -> Boolean.TRUE.equals(m.getActivo()))
                .map(m -> m.getCodigo())
                .toList();

        // Sucursal fija del usuario, resuelta vía Empleado.sucursal (null = admin/multi-sucursal)
        if (usuario.getEmpleado() != null && usuario.getEmpleado().getSucursal() != null) {
            this.sucursalId = usuario.getEmpleado().getSucursal().getId();
            this.sucursalNombre = usuario.getEmpleado().getSucursal().getNombre();
        } else {
            this.sucursalId = null;
            this.sucursalNombre = null;
        }
    }

    public Long getId() { return id; }
    public List<String> getModulos() { return modulos; }
    public Long getSucursalId() { return sucursalId; }
    public String getSucursalNombre() { return sucursalNombre; }
    public String getRolNombre() {
        return authorities.stream().findFirst()
                .map(GrantedAuthority::getAuthority)
                .orElse("ROLE_USER");
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return activo; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return activo; }
}
