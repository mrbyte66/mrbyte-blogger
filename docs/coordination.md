# Project coordination

## Work ownership

- The project orchestrator owns product scope, design direction, API contracts, and integration.
- Frontend work reads `frontend/AGENTS.md` and the relevant files in `frontend/docs/`.
- Backend work reads `backend/AGENTS.md` and the relevant files in `backend/docs/`.
- Keep frontend and backend independently buildable. Put cross-project decisions here.

## Current stage

Design the visitor experience in the frontend prototype first. Once the design and navigation are accepted, define the block model and API contract, then decide persistence and implement the Java 25 / Spring Boot backend. Do not invent APIs or a database around fixture content.

## Current decisions

- The active direction is a character-centered, single-scene landing experience; the user rejected a conventional scroll-down homepage.
- Preserve the original curly-haired CRT character and glasses. Eye gaze and blinking are active; head warping and the later portrait-based hair experiment are not part of the accepted direction.
- The site should eventually support responsive, block-based page composition and multiple content types.
- Backend application code has not started.

## Change protocol

Record decisions that affect both projects here. Keep visual details in `frontend/docs/design.md`, frontend implementation guidance in `frontend/docs/frontend.md`, and backend decisions in `backend/docs/`. Give parallel contributors non-overlapping file ownership and ask them to update the appropriate guide when a decision changes.
