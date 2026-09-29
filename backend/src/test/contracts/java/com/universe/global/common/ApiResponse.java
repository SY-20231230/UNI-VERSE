package com.universe.global.common;

/** TEST CONTRACT ONLY. Not an implementation of the team's shared infrastructure. */
public record ApiResponse<T>(boolean success, T data, ErrorResponse error) {
    public record ErrorResponse(String code, String message) { }
    public static <T> ApiResponse<T> success(T data) { return new ApiResponse<>(true, data, null); }
    public static ApiResponse<Void> failure(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorResponse(code, message));
    }
}
