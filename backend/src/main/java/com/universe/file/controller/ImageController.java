package com.universe.file.controller;

import com.universe.file.service.FileService;
import com.universe.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageController {

    private final FileService fileService;

    @PostMapping
    public ApiResponse<String> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        String key = fileService.uploadFile(file);
        String url = fileService.getFileUrl(key);
        return ApiResponse.success(url);
    }
}
