# Backend agent guide

Read the repository `../AGENTS.md`, `../docs/product.md`, and `README.md` before backend work. Read backend-specific guides from `docs/` as they are added.

Target Java 25 LTS and Spring Boot. Follow established Spring dependency-injection and package conventions. Keep web controllers, application logic, domain rules, and persistence responsibilities separate. Test business rules with unit tests; test HTTP and persistence boundaries with integration tests where they exist.

Do not guess DTOs, routes, user roles, publishing rules, or database schema from frontend fixtures. Wait for the product owner contract in `../docs/coordination.md` or document proposed contracts there before implementation.
