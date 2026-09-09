package com.restaurante;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RestauranteApplication {
    public static void main(String[] args) {
        SpringApplication.run(RestauranteApplication.class, args);
    }
}

