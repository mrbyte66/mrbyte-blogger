# Frontend release image: Next.js standalone server. CI runs `npm test` and `npm run typecheck`
# before this build. Pin the base image by digest when cutting a release.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
# The /api rewrite is resolved at build time; in production Caddy routes /api before Next anyway.
ENV NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_INTERNAL_URL=http://backend:8080
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# Standalone output contains only the traced runtime files; static assets are copied beside it.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# A static asset: proves the Node server answers without calling the backend.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD wget -q --spider http://127.0.0.1:3000/favicon.svg || exit 1
CMD ["node", "server.js"]
