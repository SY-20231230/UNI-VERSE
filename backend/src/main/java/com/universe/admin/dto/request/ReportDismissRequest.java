package com.universe.admin.dto.request;
import jakarta.validation.constraints.*;
public record ReportDismissRequest(@NotBlank @Size(max = 10000) String adminNote) {}
