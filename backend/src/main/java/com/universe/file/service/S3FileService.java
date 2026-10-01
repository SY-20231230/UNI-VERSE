package com.universe.file.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.s3.enabled", havingValue = "true")
public class S3FileService implements FileService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final String region;

    public S3FileService(
            @Value("${app.s3.bucket}") String bucketName,
            @Value("${app.s3.region:ap-northeast-2}") String region) {
        this.bucketName = bucketName;
        this.region = region;
        // Uses default credentials provider chain (ECS Task Role, ~/.aws/credentials, etc.)
        this.s3Client = S3Client.builder().build();
        this.s3Presigner = S3Presigner.builder().build();
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
        
        // Example logic to categorize. For now we put all under "uploads/" prefix in S3
        String objectKey = "uploads/" + uniqueFilename;

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putObjectRequest, 
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        // Return the object key (Frontend will submit this to DB)
        return objectKey;
    }

    @Override
    public String getFileUrl(String storedKey) {
        if (storedKey == null || storedKey.isEmpty()) return null;
        
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(storedKey)
                .build();
                
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getObjectRequest)
                .build();
                
        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public void deleteFile(String storedKey) {
        if (storedKey != null && !storedKey.isEmpty()) {
            try {
                DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(storedKey)
                        .build();
                s3Client.deleteObject(deleteObjectRequest);
            } catch (Exception e) {
                // Ignore just like LocalFileService does
            }
        }
    }
}
