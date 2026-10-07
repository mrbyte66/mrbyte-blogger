# Backend agent guide

Read the repository `../AGENTS.md`, `../docs/product.md`, and `README.md` before backend work. The design sources are `../docs/backend-architecture.md`, `../docs/api-contract.md` and `../docs/deployment-vps.md`; implemented endpoints are mirrored in `docs/openapi.yaml`.

Target Java 25 LTS and Spring Boot. Follow established Spring dependency-injection and package conventions. Keep web controllers, application logic, domain rules, and persistence responsibilities separate (`api` / `application` / `domain` / `infrastructure` per module; enforced by `ArchitectureTest`). Test business rules with unit tests; test HTTP and persistence boundaries with integration tests against real PostgreSQL (never H2).

Do not guess DTOs, routes, user roles, publishing rules, or database schema from frontend fixtures. Follow the API contract; when a needed decision is missing, choose the smallest safe reversible option and record it in `README.md` and the owning document. Never edit an applied Flyway migration. Run `./mvnw verify` after meaningful changes and report skipped integration tests explicitly.
