FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew \
    && ./gradlew bootJar --no-daemon \
    && cp "$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' -print -quit)" /workspace/app.jar

FROM eclipse-temurin:21-jre

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app
COPY --from=build --chown=app:app /workspace/app.jar ./app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD curl --fail --silent http://127.0.0.1:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]