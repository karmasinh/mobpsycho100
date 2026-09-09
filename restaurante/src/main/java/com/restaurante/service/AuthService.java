package com.restaurante.service;

import com.restaurante.dto.request.LoginRequest;
import com.restaurante.dto.response.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    void logout(String username);
}
