# Backend release image. CI runs `./mvnw verify` (with PostgreSQL integration tests) before building
# this image; the image build itself only packages the tested sources.
# Pin both base images by digest when cutting a release (see deploy/runbooks/release.md).

FROM eclipse-temurin:25-jdk-noble AS build
WORKDIR /workspace
# Dependencies first, so source edits do not invalidate the Maven cache layer.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Strip CR in case the checkout used Windows line endings.
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests \
    && cp target/satir-backend-*.jar /workspace/app.jar

FROM eclipse-temurin:25-jre-noble
# Non-root runtime user; the media volume is the only writable application path.
RUN groupadd --system --gid 10001 satir \
    && useradd --system --uid 10001 --gid satir --no-create-home --shell /usr/sbin/nologin satir \
    && mkdir -p /var/lib/satir/media \
    && chown -R satir:satir /var/lib/satir
WORKDIR /app
COPY --from=build --chown=root:root /workspace/app.jar /app/app.jar
USER satir:satir
ENV SATIR_MEDIA_ROOT=/var/lib/satir/media \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=55 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/urandom"
EXPOSE 8080
# Readiness includes the database; liveness does not (management config). No curl needed.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /actuator/health/readiness HTTP/1.0\r\nHost: localhost\r\n\r\n" >&3 && grep -q "\"UP\"" <&3'
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
