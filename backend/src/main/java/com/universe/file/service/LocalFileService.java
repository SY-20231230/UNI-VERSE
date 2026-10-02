package com.universe.file.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.s3.enabled", havingValue = "false", matchIfMissing = true)
public class LocalFileService implements FileService {

    private final String uploadDir = "uploads";

    public LocalFileService() {
        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".") ? 
                           originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        String uniqueFilename = UUID.randomUUID().toString() + extension;
        Path targetPath = Paths.get(uploadDir, uniqueFilename);
        Files.copy(file.getInputStream(), targetPath);
        return "/uploads/" + uniqueFilename;
    }

    @Override
    public String getFileUrl(String storedKey) {
        return storedKey;
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl != null && fileUrl.startsWith("/uploads/")) {
            String filename = fileUrl.substring("/uploads/".length());
            Path targetPath = Paths.get(uploadDir, filename);
            try {
                Files.deleteIfExists(targetPath);
            } catch (IOException e) {
                // Ignore
            }
        }
    }

    @Override
    public void saveSessionLog(String sessionId, String csvLine) {
        try {
            Path logPath = Paths.get(uploadDir, "session_logs.csv");
            if (!Files.exists(logPath)) {
                Files.writeString(logPath, "\uFEFF사용자 ID,이메일,닉네임,로그인 시각,마지막 API 요청 시각,종료 시각,체류시간(초),종료 사유\r\n");
            }
            Files.writeString(logPath, csvLine + "\r\n", java.nio.file.StandardOpenOption.APPEND);
        } catch (IOException e) {
            // Ignore
        }
    }
}
