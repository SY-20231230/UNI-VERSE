package com.universe.auth.dto.request;
import jakarta.validation.constraints.*;
import lombok.Getter; @Getter
public class SignupRequest { @NotBlank @Email private String email; @NotBlank @Size(min=8,max=100) private String password; @NotBlank @Size(max=50) private String name; @NotBlank @Size(max=50) private String nickname; }
