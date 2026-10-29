# Multi-stage Dockerfile for Digital Document Vault Backend
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /workspace/app

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy pom.xml and cache dependencies
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# Runtime Image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Create non-privileged service user
RUN groupadd -r vaultgroup && useradd -r -g vaultgroup -m vaultuser

# Create storage directory for uploaded documents
RUN mkdir -p /vault/storage && chown -R vaultuser:vaultgroup /vault/storage

# Copy built jar from builder stage
COPY --from=builder /workspace/app/target/digital-document-vault-1.0.0.jar app.jar
RUN chown vaultuser:vaultgroup app.jar

USER vaultuser

EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=docker
ENV VAULT_STORAGE_LOCAL_BASE_DIR=/vault/storage

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
