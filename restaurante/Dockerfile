# Build explícito por Dockerfile — la autodetección de Railpack/Nixpacks en Railway
# no reconocía este directorio como una app Java/Maven cuando el "Root Directory"
# del servicio apunta a restaurante/ (ver error "Railpack could not determine how
# to build the app"). Un Dockerfile evita depender de esa heurística.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
