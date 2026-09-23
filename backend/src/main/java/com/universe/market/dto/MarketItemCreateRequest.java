package com.universe.market.dto;

import com.universe.market.entity.ItemCategory;
import com.universe.market.entity.ItemCondition;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter
@NoArgsConstructor
public class MarketItemCreateRequest {
    @NotBlank
    private String title;
    
    @NotNull
    private ItemCategory category;
    
    @NotNull
    private ItemCondition condition;
    
    @NotNull
    private Long purchasePrice;
    
    @NotNull
    private Long listedPrice;
    
    @NotBlank
    private String description;
}
