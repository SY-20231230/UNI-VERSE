package com.universe.file.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileService {
    String uploadFile(MultipartFile file) throws IOException;
    String getFileUrl(String storedKey);
    void deleteFile(String storedKey);
}
