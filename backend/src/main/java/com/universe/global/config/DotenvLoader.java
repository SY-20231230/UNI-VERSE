package com.universe.global.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

// spring-dotenv 라이브러리가 이 프로젝트의 Spring Boot 버전에서 .env를 로드하지 못해 직접 구현.
// System property로 심어서 SpringApplication.run() 전에 호출하면 Environment가 항상 읽어들인다.
public final class DotenvLoader {

    private DotenvLoader() {
    }

    public static void load() {
        Path envFile = Path.of(".env");
        if (!Files.isRegularFile(envFile)) {
            return;
        }

        try {
            List<String> lines = Files.readAllLines(envFile, StandardCharsets.UTF_8);
            for (String line : lines) {
                String trimmed = line.strip();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int idx = trimmed.indexOf('=');
                if (idx <= 0) {
                    continue;
                }
                String key = trimmed.substring(0, idx).strip();
                String value = trimmed.substring(idx + 1).strip();
                if (value.length() >= 2 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
                    value = value.substring(1, value.length() - 1);
                }
                if (System.getProperty(key) == null && System.getenv(key) == null) {
                    System.setProperty(key, value);
                }
            }
        } catch (IOException e) {
            // .env를 못 읽으면 조용히 넘어가고 실제 환경변수/시스템 프로퍼티에 맡긴다.
        }
    }
}
