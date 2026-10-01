# Backend application

This directory is reserved for the Java 25 LTS and Spring Boot backend. It is intentionally not initialized with application code yet: content models, API shape, authentication and database choice depend on approving the frontend design and page-builder contract first.

When implementation starts, use a standard Maven Spring Boot layout here:

```text
src/main/java/...
src/main/resources/application.yml
src/test/java/...
pom.xml
```

Record domain/API decisions in `docs/` before coding. Keep controllers thin, business behavior in focused services/domain types, persistence behind repositories, and meaningful unit/integration tests alongside the code they verify.
