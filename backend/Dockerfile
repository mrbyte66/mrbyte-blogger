# Supply verified image references (digest-pinned for production) at build time.
ARG JAVA_BUILD_IMAGE
ARG JAVA_RUNTIME_IMAGE
FROM ${JAVA_BUILD_IMAGE} AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline
COPY src src
# PostgreSQL integration tests run in CI before this image build; not silently claimed here.
RUN ./mvnw -B -DskipTests package
FROM ${JAVA_RUNTIME_IMAGE} AS runtime
WORKDIR /app
COPY --from=build --chown=10001:10001 /src/target/satir-backend-0.1.0-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
