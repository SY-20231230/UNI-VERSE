package com.universe.trade.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class TradeCreateRequest {
    @NotNull
    private Long itemId;
}
