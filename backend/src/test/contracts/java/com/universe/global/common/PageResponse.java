package com.universe.global.common;

import java.util.List;
import org.springframework.data.domain.Page;

/** TEST CONTRACT ONLY. Adjust the report controller when the real shared contract arrives. */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> source) {
        return new PageResponse<>(source.getContent(), source.getNumber(), source.getSize(),
                source.getTotalElements(), source.getTotalPages());
    }
}
