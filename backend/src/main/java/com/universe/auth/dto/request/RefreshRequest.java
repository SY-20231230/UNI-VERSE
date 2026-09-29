package com.universe.auth.dto.request;
import jakarta.validation.constraints.NotBlank; import lombok.Getter; @Getter
public class RefreshRequest { @NotBlank private String refreshToken; }
